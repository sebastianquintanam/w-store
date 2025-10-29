import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot(): string {
    return 'API W-Store funcionando correctamente 🚀';
  }

  @Get('health')
  getHealth() {
    return { ok: true, 
              timestamp: new Date().toISOString() };
  }
}
