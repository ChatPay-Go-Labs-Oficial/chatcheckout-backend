import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('order')
@Controller('order')
export class OrderController {}
