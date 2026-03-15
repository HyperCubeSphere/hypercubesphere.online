import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/$locale/blog')({
  component: () => <Outlet />,
})
