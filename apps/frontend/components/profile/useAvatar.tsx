// components/UserAvatar.tsx
import Image from "next/image";

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
  if (avatarUrl) {
    return (
      <div className={`${sizes[size]} relative rounded-full overflow-hidden shrink-0`}>
        <Image
          src={avatarUrl}
          alt={username}
          fill
          className="object-cover"
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