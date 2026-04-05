import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiAuditLog } from './ai-audit-log.entity';
import { AiAuditService } from './ai-audit.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AiAuditLog])],
  providers: [AiAuditService],
  exports: [AiAuditService],
})
export class AiAuditModule {}
