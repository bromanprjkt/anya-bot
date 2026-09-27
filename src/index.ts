import { AplikasiAnya } from "./app.js";
import { buatPencatat } from "./utils/logger.js";

const pencatat = buatPencatat("Bootstrap");

async function jalankanAplikasi(): Promise<void> {
  const aplikasi = new AplikasiAnya();

  const tanganiPenghentian = async (namaSinyal: string): Promise<void> => {
    pencatat.info({ sinyal: namaSinyal }, "Menerima sinyal penghentian proses");
    try {
      await aplikasi.berhenti();
      process.exit(0);
    } catch (kesalahan) {
      pencatat.error({ kesalahan }, "Terjadi kesalahan saat menghentikan aplikasi");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void tanganiPenghentian("SIGINT");
  });

  process.on("SIGTERM", () => {
    void tanganiPenghentian("SIGTERM");
  });

  process.on("unhandledRejection", (alasan) => {
    pencatat.error({ alasan }, "Terjadi penolakan promise yang tidak ditangani");
  });

  process.on("uncaughtException", (kesalahan) => {
    pencatat.fatal({ kesalahan }, "Terjadi eksepsi fatal yang tidak tertangkap");
    process.exit(1);
  });

  try {
    await aplikasi.mulai();
  } catch (kesalahan) {
    pencatat.fatal({ kesalahan }, "Gagal memulai aplikasi Anya Bot");
    process.exit(1);
  }
}

void jalankanAplikasi();
