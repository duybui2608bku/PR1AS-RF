import Link from "next/link"

import { siteConfig } from "@/config/site"
import { footerNav } from "@/config/nav"
import { cn } from "@/lib/utils"

const socialLinks = [
  {
    label: "Zalo",
    href: siteConfig.links.zalo,
    icon: (
      <span aria-hidden="true" className="text-[10px] leading-none font-bold">
        Zalo
      </span>
    ),
  },
  {
    label: "Facebook",
    href: siteConfig.links.facebook,
    icon: (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
] as const

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t", className)}>
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-semibold">
              {siteConfig.name}
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              {siteConfig.description}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {socialLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className="flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {footerNav.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-medium">{section.title}</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {siteConfig.name}. Bản quyền thuộc
            về chúng tôi.
          </p>
          <p>
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="hover:text-foreground"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
