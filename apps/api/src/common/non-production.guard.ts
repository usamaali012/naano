import {
  CanActivate,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

/**
 * Blocks a route whenever NODE_ENV === "production". Responds 404 (not 403) so
 * a production deployment gives no hint the route exists. Used for dev-only
 * inspection endpoints.
 */
@Injectable()
export class NonProductionGuard implements CanActivate {
  canActivate(): boolean {
    if (process.env.NODE_ENV === "production") {
      throw new NotFoundException("Cannot GET (not found)");
    }
    return true;
  }
}
