import React from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideProps } from 'lucide-react'

export interface IconProps extends LucideProps {
  name: keyof typeof LucideIcons
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, ...props }) => {
  const IconComponent = LucideIcons[name] as React.FC<LucideProps>
  if (!IconComponent) return null
  return <IconComponent size={size} {...props} />
}

export default Icon
