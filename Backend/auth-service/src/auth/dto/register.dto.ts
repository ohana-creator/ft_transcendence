import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    Matches,
    IsNotEmpty,
} from "class-validator"

export class RegisterDto 
{
    
    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @MinLength(3)
    @MaxLength(30)
    @Matches(/^[a-zA-Z0-9_]{3,30}$/)
    username!: string;

    @IsString()
    @MinLength(3)
    @MaxLength(30)
    fullName!: string;

    @IsString()
    @MinLength(6)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
    password!: string;
    
}