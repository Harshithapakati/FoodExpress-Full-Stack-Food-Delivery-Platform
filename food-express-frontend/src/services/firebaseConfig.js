// Firebase web app config and Web Push VAPID key for FCM (filled from user input).
// Do NOT commit your service account JSON to git; place the JSON at the path configured
// in the backend `.env` (SERVICE_ACCOUNT_PATH). The file `food-express-backend/config` is
// gitignored for this purpose.

const firebaseConfig = {
	apiKey: "AIzaSyBElhcc78GVO7dmDwLmvU-sx-kkLbVBHjk",
	authDomain: "foodexpress-41056.firebaseapp.com",
	projectId: "foodexpress-41056",
	storageBucket: "foodexpress-41056.firebasestorage.app",
	messagingSenderId: "800450847647",
	appId: "1:800450847647:web:0948dfbc59bc4c0ee753aa",
	measurementId: "G-1TTRCMS848"
};

// Public VAPID key (Web Push certificate) — keep private key secret inside Firebase console
export const VAPID_KEY = "BKPRn5nWQwL0Epso5JgCn606m27Wb5DsRoXjBIxhVRYvJAR_-YKf5D7BcFlKElnIAgGMts2yq5szzjM5Tv80kS8";

export default firebaseConfig;
