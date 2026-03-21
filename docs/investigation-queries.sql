-- =============================================================================
-- QUERIES DE INVESTIGAÇÃO - INCIDENTE ORDERS DESAPARECIDOS
-- =============================================================================
-- Execute estas queries no PostgreSQL do Railway para investigar o incidente
-- =============================================================================

-- 1. VERIFICAR ESTADO ATUAL DAS TABELAS PRINCIPAIS
-- =============================================================================
SELECT
    'orders' as table_name,
    COUNT(*) as current_count,
    MAX(created_at) as last_record_date,
    MIN(created_at) as first_record_date
FROM orders
UNION ALL
SELECT
    'users',
    COUNT(*),
    MAX(created_at),
    MIN(created_at)
FROM users
UNION ALL
SELECT
    'product',
    COUNT(*),
    MAX(created_at),
    MIN(created_at)
FROM product
UNION ALL
SELECT
    'stripe_transactions',
    COUNT(*),
    MAX(created_at),
    MIN(created_at)
FROM stripe_transactions
UNION ALL
SELECT
    'crypto_transactions',
    COUNT(*),
    MAX(created_at),
    MIN(created_at)
FROM crypto_transactions;

-- 2. VERIFICAR SE HÁ INDÍCIO DE TRUNCATE (sequence alta, tabela vazia)
-- =============================================================================
-- Se sequence_value for alto mas table_count for 0, indica TRUNCATE
SELECT
    (SELECT COUNT(*) FROM orders) as table_count,
    (SELECT COALESCE(last_value, 0) FROM orders_id_seq) as sequence_value,
    CASE
        WHEN (SELECT COUNT(*) FROM orders) = 0
             AND (SELECT COALESCE(last_value, 0) FROM orders_id_seq) > 0
        THEN '⚠️ POSSIVEL TRUNCATE DETECTADO'
        ELSE '✅ Parece normal'
    END as status;

-- 3. VERIFICAR HISTÓRICO DE MIGRATIONS
-- =============================================================================
SELECT
    name as migration_name,
    timestamp as executed_at,
    CASE
        WHEN name LIKE '%SplitOrders%' THEN '⚠️ Migration que separou orders/transactions'
        WHEN name LIKE '%Drop%' OR name LIKE '%drop%' THEN '⚠️ Migration que remove algo'
        ELSE '✅ Migration normal'
    END as note
FROM migrations_history
ORDER BY timestamp DESC
LIMIT 10;

-- 4. VERIFICAR SE AUDIT_LOG JÁ EXISTE E TEM REGISTROS
-- =============================================================================
SELECT
    table_name,
    operation,
    COUNT(*) as count,
    MAX(executed_at) as last_occurrence
FROM audit_log
WHERE table_name = 'orders'
GROUP BY table_name, operation
ORDER BY last_occurrence DESC;

-- 5. VERIFICAR OPERAÇÕES SUSPEITAS (se audit_log existir)
-- =============================================================================
-- Deleções na tabela orders
SELECT
    id,
    operation,
    old_data->>'id' as deleted_order_id,
    old_data->>'totalAmount' as deleted_amount,
    query_text,
    executed_at,
    ip_address
FROM audit_log
WHERE table_name = 'orders'
  AND operation IN ('DELETE', 'TRUNCATE', 'DROP')
ORDER BY executed_at DESC
LIMIT 20;

-- 6. VERIFICAR STRIPE TRANSACTIONS QUE PODEM ESTAR ÓRFÃS
-- =============================================================================
-- Se houver stripe_transactions sem orders correspondentes
SELECT
    st.id as transaction_id,
    st.order_id,
    st.amount,
    st.status,
    st.created_at,
    CASE
        WHEN o.id IS NULL THEN '⚠️ ORPHAN - Order não existe!'
        ELSE '✅ Order existe'
    END as status
FROM stripe_transactions st
LEFT JOIN orders o ON st.order_id = o.id
ORDER BY st.created_at DESC
LIMIT 20;

-- 7. VERIFICAR CRYPTO TRANSACTIONS QUE PODEM ESTAR ÓRFÃS
-- =============================================================================
SELECT
    ct.id as transaction_id,
    ct.order_id,
    ct.amount_fiat,
    ct.status,
    ct.created_at,
    CASE
        WHEN o.id IS NULL THEN '⚠️ ORPHAN - Order não existe!'
        ELSE '✅ Order existe'
    END as status
FROM crypto_transactions ct
LEFT JOIN orders o ON ct.order_id = o.id
ORDER BY ct.created_at DESC
LIMIT 20;

-- 8. VERIFICAR SESSÕES DE CHECKOUT COM ORDERS DESAPARECIDAS
-- =============================================================================
SELECT
    cte.session_id,
    cte.order_id,
    cte.event_type,
    cte.occurred_at,
    CASE
        WHEN o.id IS NULL THEN '⚠️ Order foi deletada!'
        ELSE '✅ Order ainda existe'
    END as status
FROM checkout_tracking_events cte
LEFT JOIN orders o ON cte.order_id = o.id
WHERE cte.order_id IS NOT NULL
ORDER BY cte.occurred_at DESC
LIMIT 20;

-- 9. ESTATÍSTICAS DO BANCO DE DADOS
-- =============================================================================
SELECT
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE tablename = 'orders';

-- 10. VERIFICAR CONEXÕES ATIVAS (últimas 24h se disponível)
-- =============================================================================
SELECT
    datname,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
ORDER BY query_start DESC;

-- 11. VERIFICAR TAMANHO DAS TABELAS
-- =============================================================================
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'users', 'product', 'stripe_transactions', 'crypto_transactions', 'checkout_tracking_events', 'audit_log')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 12. RESUMO EXECUTIVO
-- =============================================================================
SELECT
    'Orders existentes' as metric,
    COUNT(*) as value
FROM orders
UNION ALL
SELECT
    'Stripe transactions órfãs',
    COUNT(*)
FROM stripe_transactions st
LEFT JOIN orders o ON st.order_id = o.id
WHERE o.id IS NULL
UNION ALL
SELECT
    'Crypto transactions órfãs',
    COUNT(*)
FROM crypto_transactions ct
LEFT JOIN orders o ON ct.order_id = o.id
WHERE o.id IS NULL
UNION ALL
SELECT
    'Migrations executadas',
    COUNT(*)
FROM migrations_history
UNION ALL
SELECT
    'Audit log entries',
    COUNT(*)
FROM audit_log;

-- =============================================================================
-- INSTRUÇÕES
-- =============================================================================
-- 1. Execute cada seção separadamente para não sobrecarregar
-- 2. Preste atenção aos avisos (⚠️)
-- 3. Se encontrar operações suspeitas em audit_log, investigue o query_text e ip_address
-- 4. Para ver logs mais detalhados do Railway, use: railway logs --lines 500
-- =============================================================================
