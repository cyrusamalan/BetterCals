'use client';

import clsx from 'clsx';

export default function BetterCalsMark({
  className,
  title = 'BetterCals',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={clsx('block', className)}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>

      {/* Leaf (behind, right) */}
      <path
        d="
          M 176 66
          C 206 94 220 132 210 170
          C 198 214 150 232 118 210
          C 122 170 140 112 176 66
          Z
        "
        fill="#6F8B73"
      />
      {/* Leaf inner shade */}
      <path
        d="
          M 186 84
          C 203 106 209 132 204 158
          C 196 190 167 204 145 196
          C 151 165 162 120 186 84
          Z
        "
        fill="#5E7865"
        opacity="0.7"
      />

      {/* Flame outer (left) */}
      <path
        d="
          M 106 26
          C 142 66 166 100 166 142
          C 166 202 126 228 88 228
          C 58 228 38 206 38 178
          C 38 134 78 106 96 74
          C 110 50 112 38 106 26
          Z
        "
        fill="#F28C2B"
      />

      {/* Flame inner (darker orange) */}
      <path
        d="
          M 122 54
          C 146 84 150 110 140 134
          C 124 176 114 194 122 220
          C 92 202 82 172 86 148
          C 92 114 120 100 126 76
          C 128 68 127 60 122 54
          Z
        "
        fill="#E56B22"
        opacity="0.95"
      />

      {/* Red stripe */}
      <path
        d="
          M 138 64
          C 154 94 152 116 140 136
          C 124 164 118 184 126 206
          C 108 192 104 172 110 154
          C 118 132 136 120 140 102
          C 144 86 144 74 138 64
          Z
        "
        fill="#D94A2A"
        opacity="0.92"
      />
    </svg>
  );
}

