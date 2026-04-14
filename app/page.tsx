import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "#f5f0e8" }}
    >
      <div className="text-center max-w-md">
        <Image
          src="/logo.png"
          alt="InPharma 2026"
          width={320}
          height={100}
          className="mx-auto mb-8"
          priority
        />
        <p className="text-lg mb-10" style={{ color: "#1a3a5c" }}>
          Live audience polling for your presentation
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/join"
            className="block w-full py-4 rounded-xl text-white text-lg font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#e8632b" }}
          >
            Join as Participant
          </Link>
          <Link
            href="/admin"
            className="block w-full py-4 rounded-xl text-lg font-semibold border-2 transition-opacity hover:opacity-80"
            style={{ color: "#1a3a5c", borderColor: "#1a3a5c" }}
          >
            Presenter Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
