import type { PageServerLoad  } from './$types.js';

export const load:PageServerLoad = async ({ cookies,getClientAddress, fetch }) => {
    let sessionId = cookies.get('sessionId');
    if(!sessionId) {
        const adress = getClientAddress();
        cookies.set('sessionId',adress,{ path:'/' });
        sessionId = adress;
    } 

	return {
		sessionId
	};
};
