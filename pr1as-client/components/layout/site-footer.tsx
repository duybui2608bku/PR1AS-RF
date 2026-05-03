import Link from "next/link"

import { siteConfig } from "@/config/site"
import { footerNav } from "@/config/nav"

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-semibold">
              {siteConfig.name}
            </Link>
            <p className="text-muted-foreground mt-2 max-w-xs text-sm">{siteConfig.description}</p>
          </div>

          {footerNav.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-medium">{section.title}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-muted-foreground mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p>
            <a href={`mailto:${siteConfig.contactEmail}`} className="hover:text-foreground">
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
