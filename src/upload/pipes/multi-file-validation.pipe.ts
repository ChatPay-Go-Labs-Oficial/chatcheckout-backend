import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class MultiFileValidationPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não encontrado');
    }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo inválido: ${file.originalname} (${file.mimetype})`,
      );
    }
    return file;
  }
}
