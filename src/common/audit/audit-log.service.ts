import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryRunner } from 'typeorm';

/**
 * Interface para registros de auditoria
 */
export interface AuditLogEntry {
  id: string;
  tableName: string;
  operation: string;
  oldData?: any;
  newData?: any;
  userName?: string;
  queryText?: string;
  executedAt: Date;
  ipAddress?: string;
}

/**
 * Serviço para consultar logs de auditoria
 * Útil para investigar incidentes de segurança ou perda de dados
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLogService');

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Busca registros de auditoria por tabela
   */
  async findByTable(
    tableName: string,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT * FROM audit_log
        WHERE table_name = $1
        ORDER BY executed_at DESC
        LIMIT $2
        `,
        [tableName, limit],
      );

      return this.mapToAuditLogEntries(result);
    } catch (error) {
      this.logger.error(`Error fetching audit logs for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Busca operações de deleção em uma tabela
   */
  async findDeletions(
    tableName: string,
    limit: number = 50,
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT * FROM audit_log
        WHERE table_name = $1 AND operation IN ('DELETE', 'TRUNCATE', 'DROP')
        ORDER BY executed_at DESC
        LIMIT $2
        `,
        [tableName, limit],
      );

      return this.mapToAuditLogEntries(result);
    } catch (error) {
      this.logger.error(`Error fetching deletions for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Busca todas as operações suspeitas recentes
   */
  async findSuspiciousOperations(limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT * FROM audit_log
        WHERE operation IN ('DELETE', 'TRUNCATE', 'DROP')
        ORDER BY executed_at DESC
        LIMIT $1
        `,
        [limit],
      );

      return this.mapToAuditLogEntries(result);
    } catch (error) {
      this.logger.error('Error fetching suspicious operations:', error);
      return [];
    }
  }

  /**
   * Busca logs por período
   */
  async findByPeriod(
    startDate: Date,
    endDate: Date,
    limit: number = 100,
  ): Promise<AuditLogEntry[]> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT * FROM audit_log
        WHERE executed_at BETWEEN $1 AND $2
        ORDER BY executed_at DESC
        LIMIT $3
        `,
        [startDate, endDate, limit],
      );

      return this.mapToAuditLogEntries(result);
    } catch (error) {
      this.logger.error('Error fetching audit logs by period:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas de operações por tabela
   */
  async getOperationStats(): Promise<any[]> {
    try {
      const result = await this.dataSource.query(
        `
        SELECT
          table_name,
          operation,
          COUNT(*) as count
        FROM audit_log
        WHERE executed_at > NOW() - INTERVAL '7 days'
        GROUP BY table_name, operation
        ORDER BY count DESC
        `,
      );

      return result;
    } catch (error) {
      this.logger.error('Error fetching operation stats:', error);
      return [];
    }
  }

  /**
   * Mapeia resultado do banco para interface tipada
   */
  private mapToAuditLogEntries(result: any[]): AuditLogEntry[] {
    if (!result) return [];

    return result.map((row) => ({
      id: row.id,
      tableName: row.table_name,
      operation: row.operation,
      oldData: row.old_data,
      newData: row.new_data,
      userName: row.user_name,
      queryText: row.query_text,
      executedAt: row.executed_at,
      ipAddress: row.ip_address,
    }));
  }
}
