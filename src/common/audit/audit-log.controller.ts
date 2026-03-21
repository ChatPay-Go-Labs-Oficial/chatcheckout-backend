import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';
import { AuditLogService } from './audit-log.service';

/**
 * Controller para consulta de logs de auditoria
 * Permite investigar incidentes de segurança e perda de dados
 */
@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get audit logs by table name',
    description: 'Retrieve audit logs for a specific table. Useful for investigating data loss or unauthorized operations.',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully.',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            tableName: 'orders',
            operation: 'DELETE',
            oldData: { id: 'abc-123', totalAmount: 9990 },
            queryText: 'DELETE FROM orders WHERE id = $1',
            executedAt: '2026-03-20T10:30:00.000Z',
          },
        ],
      },
    },
  })
  async getLogsByTable(
    @Query('table') tableName: string,
    @Query('limit') limit: number = 100,
  ) {
    if (!tableName) {
      return { error: 'table parameter is required' };
    }
    return this.auditLogService.findByTable(tableName, Number(limit));
  }

  @Get('deletions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get deletion operations for a table',
    description: 'Retrieve all DELETE and TRUNCATE operations for a specific table.',
  })
  async getDeletions(
    @Query('table') tableName: string,
    @Query('limit') limit: number = 50,
  ) {
    if (!tableName) {
      return { error: 'table parameter is required' };
    }
    return this.auditLogService.findDeletions(tableName, Number(limit));
  }

  @Get('suspicious')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get all suspicious operations',
    description: 'Retrieve all DELETE, TRUNCATE, and DROP operations across all tables.',
  })
  async getSuspicious(@Query('limit') limit: number = 50) {
    return this.auditLogService.findSuspiciousOperations(Number(limit));
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get operation statistics',
    description: 'Get statistics of operations grouped by table and operation type for the last 7 days.',
  })
  async getStats() {
    return this.auditLogService.getOperationStats();
  }

  @Get('period')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get audit logs by time period',
    description: 'Retrieve audit logs within a specific time range.',
  })
  async getByPeriod(
    @Query('start') startDate: string,
    @Query('end') endDate: string,
    @Query('limit') limit: number = 100,
  ) {
    if (!startDate || !endDate) {
      return { error: 'start and end parameters are required (ISO 8601 format)' };
    }
    return this.auditLogService.findByPeriod(
      new Date(startDate),
      new Date(endDate),
      Number(limit),
    );
  }
}
