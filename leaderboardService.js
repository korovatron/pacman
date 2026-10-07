// Firestore access for the leaderboard. Exposes window.leaderboardService, or leaves it
// undefined if the SDK can't be loaded (e.g. offline) so the game carries on without it.
const FIREBASE_VERSION = "12.19.0";

// Paste the config from Firebase console > Project settings > Your apps > Web app
const firebaseConfig = {
    apiKey: "AIzaSyCA132_G_DlpUjibxmar-KRKDm9DCWI7W4",
    authDomain: "pacman-d0f8d.firebaseapp.com",
    projectId: "pacman-d0f8d",
    storageBucket: "pacman-d0f8d.firebasestorage.app",
    messagingSenderId: "764689198799",
    appId: "1:764689198799:web:c036940a7e86fa875251ba"
};

try {
    if (firebaseConfig.apiKey.startsWith("YOUR_")) {
        throw new Error("Firebase config has not been filled in");
    }
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;
    const [{ initializeApp }, firestore] = await Promise.all([
        import(base + "firebase-app.js"),
        import(base + "firebase-firestore.js")
    ]);
    const { getFirestore, collection, query, orderBy, limit, getDocs, addDoc, serverTimestamp } = firestore;

    const db = getFirestore(initializeApp(firebaseConfig));
    const scores = collection(db, "scores");

    window.leaderboardService = {
        async fetchTop(count) {
            const snapshot = await getDocs(query(scores, orderBy("score", "desc"), limit(count)));
            return snapshot.docs.map(doc => {
                const { name, score, level, createdAt } = doc.data();
                // createdAt can be null for an instant after submit, before the server timestamp resolves
                return { name, score, level, createdAt: createdAt ? createdAt.toDate() : null };
            });
        },
        async submit({ name, score, level }) {
            await addDoc(scores, { name, score, level, createdAt: serverTimestamp() });
        }
    };
} catch (err) {
    console.warn("Leaderboard unavailable:", err);
}

window.leaderboardReady = true;
window.dispatchEvent(new Event("leaderboard-ready"));
