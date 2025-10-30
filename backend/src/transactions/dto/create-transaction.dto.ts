// src/transactions/dto/create-transaction.dto.ts
import { IsEmail, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CustomerDto {
    @IsString()
    @IsNotEmpty()
    fullName!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @IsNotEmpty()
    address!: string;
}

export class CreateTransactionDto {
    @IsString()
    @IsNotEmpty()
    productId!: string;

    @IsInt()
    @Min(0)
    deliveryCents!: number;

    @ValidateNested()
    @Type(() => CustomerDto)
    customer!: CustomerDto;
}
