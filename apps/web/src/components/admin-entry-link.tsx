'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentProps } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/current-user';

type AdminEntryLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  adminHref?: string;
  loginHref?: string;
};

function getAdminEntryHref(adminHref: string, loginHref: string) {
  return getCurrentUser().authenticated
    ? adminHref
    : loginHref;
}

export function AdminEntryLink({
  adminHref = '/admin',
  loginHref = '/login',
  onClick,
  ...props
}: AdminEntryLinkProps) {
  const router = useRouter();
  const [href, setHref] = useState(loginHref);

  useEffect(() => {
    setHref(getAdminEntryHref(adminHref, loginHref));
  }, [adminHref, loginHref]);

  return (
    <Link
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        const nextHref = getAdminEntryHref(adminHref, loginHref);
        if (nextHref !== href) {
          event.preventDefault();
          setHref(nextHref);
          router.push(nextHref);
        }
      }}
    />
  );
}
