"use client";

// Thin compatibility shim that maps the react-router-dom API used in this app
// onto next/navigation, so the ported screens work unchanged.
import NextLink from "next/link";
import {
  useRouter,
  usePathname,
  useParams as useNextParams,
  useSearchParams as useNextSearchParams,
} from "next/navigation";
import { useEffect, forwardRef } from "react";

type To = string | number;
interface NavOpts { replace?: boolean }

export function useNavigate() {
  const router = useRouter();
  return (to: To, opts?: NavOpts) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      else router.forward();
      return;
    }
    if (opts?.replace) router.replace(to);
    else router.push(to);
  };
}

// <Link to="/x"> -> next/link href
export const Link = forwardRef<HTMLAnchorElement, any>(function Link({ to, href, children, ...rest }, ref) {
  return (
    <NextLink ref={ref} href={to ?? href ?? "#"} {...rest}>
      {children}
    </NextLink>
  );
});

// <NavLink to="/x" className={({isActive})=>...}> with active matching by pathname
export function NavLink({ to, end, className, style, children, ...rest }: any) {
  const pathname = usePathname() || "";
  const path = String(to);
  const isActive = end ? pathname === path : pathname === path || pathname.startsWith(path + "/");
  const cls = typeof className === "function" ? className({ isActive }) : className;
  const st = typeof style === "function" ? style({ isActive }) : style;
  const kids = typeof children === "function" ? children({ isActive }) : children;
  return (
    <NextLink href={path} className={cls} style={st} aria-current={isActive ? "page" : undefined} {...rest}>
      {kids}
    </NextLink>
  );
}

export function useParams<T = Record<string, string>>(): T {
  return (useNextParams() as unknown) as T;
}

// react-router returns [params, setParams]; params.get(...) matches next's API.
export function useSearchParams(): [URLSearchParams, (next: any) => void] {
  const sp = useNextSearchParams();
  const router = useRouter();
  const pathname = usePathname() || "";
  const setSearchParams = (next: any) => {
    const params = new URLSearchParams(typeof next === "function" ? next(sp) : next);
    router.push(`${pathname}?${params.toString()}`);
  };
  return [(sp as unknown) as URLSearchParams, setSearchParams];
}

export function useLocation() {
  const pathname = usePathname() || "";
  const sp = useNextSearchParams();
  const search = sp?.toString() ? `?${sp.toString()}` : "";
  return { pathname, search, hash: "", state: null, key: "default" };
}

// <Navigate to="/x" replace /> performed client-side after mount.
export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [to, replace, router]);
  return null;
}
