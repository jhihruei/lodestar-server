import { Module } from '@nestjs/common';

import { ProgramService } from './program.service';
import { ProgramPackagePlanService } from './program-package-plan/program-package-plan.service';
import { ProgramPlanService } from './program-plan/program-plan.service';
import { ProgramController } from './program.controller';
import { AuthModule } from '~/auth/auth.module';

@Module({
  controllers: [ProgramController],
  imports: [AuthModule],
  providers: [ProgramService, ProgramPlanService, ProgramPackagePlanService],
  exports: [ProgramService],
})
export class ProgramModule {}
