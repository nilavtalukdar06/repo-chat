import { useParams } from "react-router";

export default function Chat() {
  const { chatId } = useParams();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <p className="text-sm font-light">Chat {chatId}</p>
    </div>
  );
}
