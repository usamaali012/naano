import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health(): { status: "ok"; time: string } {
    return { status: "ok", time: new Date().toISOString() };
  }
}
