import { Post, Controller, Body} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";

@Controller('auth')
export class AuthController
{
    constructor(private readonly authService: AuthService)
    {
    }

    @Post('register')
    async createUser(@Body() data: RegisterDto)
    {
        return this.authService.register(data);
    }
}