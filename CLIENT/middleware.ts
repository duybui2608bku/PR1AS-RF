import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserRole } from "@/lib/constants/routes";

const CLIENT_ROUTE_PREFIX = "/client";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith(CLIENT_ROUTE_PREFIX)) {
    const authStorage = request.cookies.get("auth-storage");
    
    if (authStorage) {
      try {
        const authData = JSON.parse(authStorage.value);
        const lastActiveRole = authData?.state?.user?.last_active_role;

        if (lastActiveRole === UserRole.WORKER) {
          const userId = authData?.state?.user?.id;
          const workerProfile = authData?.state?.user?.worker_profile;
          
          if (userId) {
            if (!workerProfile || workerProfile === null) {
              return NextResponse.redirect(
                new URL("/worker/setup", request.url)
              );
            }
            return NextResponse.redirect(
              new URL(`/worker/${userId}`, request.url)
            );
          }
        }
      } catch {
        return NextResponse.next();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
