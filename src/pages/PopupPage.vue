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
	<div class="popup">
		<header>
			<h1 class="text-h4">YouNotify</h1>

			<q-btn round color="secondary" icon="settings" to="/options" target="_blank" />
		</header>

		<main>
			<q-btn @click="sendNotification()" color="primary" label="send dudes"></q-btn>

			<q-btn @click="doStuff()" color="secondary" label="do stuff"></q-btn>
		</main>
	</div>
</template>

<style scoped>
.popup {
	padding: 1rem;
}

header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 2rem;
}
</style>
