import { Module } from '@nestjs/common';
import { WompiService } from './wompi.service';

@Module({
    providers: [WompiService],
    exports: [WompiService], // <-- clave: exportarlo para que otros módulos lo inyecten
})
export class WompiModule { }
