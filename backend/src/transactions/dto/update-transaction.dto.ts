import { IsIn, IsString } from 'class-validator';

export class UpdateTransactionDto {
    @IsString()
    @IsIn(['APPROVED', 'DECLINED', 'ERROR'])
    status!: 'APPROVED' | 'DECLINED' | 'ERROR';
}
