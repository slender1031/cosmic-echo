import { NotFoundPage } from "@/components/errors/not-found-page";

export const runtime = 'edge';

export default function NotFound() {
  return <NotFoundPage />;
}
