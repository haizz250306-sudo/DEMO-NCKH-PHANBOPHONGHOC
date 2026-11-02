import { LoaderCircle } from "lucide-react"

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section
        className="flex w-full max-w-md flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg"
        aria-live="polite"
        aria-label="Đang tải hệ thống"
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <LoaderCircle className="size-7 animate-spin" />
        </div>
        <h1 className="mt-4 text-lg font-bold text-slate-900">
          Đang tải hệ thống
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Đang xác thực tài khoản và nạp dữ liệu. Vui lòng chờ một chút...
        </p>
      </section>
    </main>
  )
}
