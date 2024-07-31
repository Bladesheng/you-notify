<script setup lang="ts">
import { useQuasar } from 'quasar';

const $q = useQuasar();

function sendNotification() {
	console.log('sending notif from popup');

	Notification.requestPermission().then((permission) => {
		if (permission === 'granted') {
			new Notification('This is a title', { body: 'Hello world' });
		}
	});
}

async function doStuff() {
	const res = await $q.bex.send('log', {
		message: 'bridging stuff',
	});

	console.log('Some response from the other side', res);
}
</script>

<template>
	popup works

	<q-btn @click="sendNotification()" color="primary" label="send dudes"></q-btn>

	<q-btn @click="doStuff()" color="secondary" label="do stuff"></q-btn>
</template>

<style scoped></style>
