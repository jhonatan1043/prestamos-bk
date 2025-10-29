// src/common/audit/audit-log.entity.ts
import { ApiProperty } from '@nestjs/swagger';

export class AuditLog {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  action: string;

  @ApiProperty()
  entity: string;

  @ApiProperty()
  entityId: number;

  @ApiProperty()
  details: string;

  @ApiProperty()
  createdAt: Date;
}
