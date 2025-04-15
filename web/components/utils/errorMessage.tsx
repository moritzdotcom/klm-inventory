export default function ErrorMessage({ message }: { message?: string }) {
  return message ? <p className="text-red-800">{message}</p> : undefined;
}
