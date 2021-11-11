import rtc from "./rtc";
import idGenerator from "./idGenerator";
import media from "./media";

function	getPeerIndexFrom_Id(id, array) {
	let peerIndex = -1;
	for (let index = 0; index < array.length; index++) {
		if (array[index]._id === id) {
			peerIndex = index;
			break;
		}
	}
	return (peerIndex);
}

export default {
	rtc,
	idGenerator,
	media,
	getPeerIndexFrom_Id
}