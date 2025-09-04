import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp({ credential: applicationDefault() });
const db = getFirestore(); // 기본 DB 사용

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function main() {
  const now = new Date();

  console.log("👉 샘플 유저 추가 중...");
  for (let i = 0; i < 8; i++) {
    const created = addDays(now, -i);
    await db.collection("users").add({
      email: `demo${i + 1}@example.com`,
      name: `데모${i + 1}`,
      createdAt: Timestamp.fromDate(created),
    });
  }

  console.log("👉 샘플 컨벤션 추가 중...");
  const start = addDays(now, -1);
  const end = addDays(now, 7);
  const convRef = await db.collection("conventions").add({
    name: "샘플 컨벤션",
    description: "대시보드 확인용",
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
  });

  console.log("👉 샘플 세션 2개 추가 중...");
  await convRef.collection("sessions").add({
    title: "오프닝 세션",
    dateTime: Timestamp.fromDate(new Date()),
    maxParticipants: 100,
    participants: [],
  });
  await convRef.collection("sessions").add({
    title: "워크숍 세션",
    dateTime: Timestamp.fromDate(addDays(new Date(), 1)),
    maxParticipants: 50,
    participants: [],
  });

  console.log("✅ seed 완료: users 8, conventions 1, sessions 2");
}

main().catch((e) => {
  console.error("❌ seed 실행 중 오류:", e);
  process.exit(1);
});
