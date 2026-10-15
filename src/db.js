import firebase from "firebase/app";
import "firebase/database";

const config = {
	apiKey: "AIzaSyBye6vW1y27ekk2pAjCGCLhp2yTXdiW5AU",
	authDomain: "scada-6eeea.firebaseapp.com",
	databaseURL: "https://scada-6eeea-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "scada-6eeea",
	storageBucket: "scada-6eeea.firebasestorage.app",
	messagingSenderId: "758708940083",
	appId: "1:758708940083:web:c95a9d256741434106e246",
	measurementId: "G-V7T4MY5R2M"
}

const db = firebase.initializeApp(config);
export default db;
