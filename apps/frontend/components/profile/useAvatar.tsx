// components/UserAvatar.tsx
import Image from "next/image";
import { useMemo, useState } from "react";

interface UserAvatarProps {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'fill';
}

const sizes = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  fill: 'w-full h-full',
};

function getAvatarColor(username: string): string {
  const colors = [
    'bg-purple-500', 'bg-emerald-500', 'bg-sky-500',
    'bg-amber-500', 'bg-pink-500', 'bg-indigo-500',
  ];
  const index = username.charCodeAt(0) % colors.length;
  return colors[index];
}

export function UserAvatar({ username, avatarUrl, size = 'md' }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const normalizedAvatar = useMemo(() => {
    if (!avatarUrl) return null;

    const trimmed = avatarUrl.trim();
    if (!trimmed) return null;

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }

    return `/${trimmed}`;
  }, [avatarUrl]);

  if (normalizedAvatar && !hasError) {
    return (
      <div className={`${sizes[size]} relative rounded-full overflow-hidden shrink-0`}>
        <Image
          src={normalizedAvatar}
          alt={username}
          fill
          className="object-cover"
          unoptimized={normalizedAvatar.startsWith('data:')}
          onError={() => setHasError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizes[size]} ${getAvatarColor(username)} rounded-full flex items-center justify-center font-bold text-white text-xl shrink-0 uppercase`}>
      {username[0]}
    </div>
  );
}