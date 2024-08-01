<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onMounted, ref } from 'vue';

const $q = useQuasar();

const token = ref('');
const url = ref('');

onMounted(async () => {
	const tokenStorage = await $q.bex.send('storage.get', {
		key: 'YouTrackApiToken',
	});
	const urlStorage = await $q.bex.send('storage.get', {
		key: 'YouTrackUrl',
	});

	token.value = tokenStorage.data;
	url.value = urlStorage.data;
});

async function saveSettings() {
	await $q.bex.send('storage.set', {
		key: 'YouTrackApiToken',
		value: token.value,
	});

	await $q.bex.send('storage.set', {
		key: 'YouTrackUrl',
		value: url.value,
	});

	$q.notify({
		type: 'positive',
		message: 'Settings saved',
	});
}
</script>

<template>
	<q-input v-model="token" label="YouTrack Token" />

	<q-input v-model="url" label="YouTrack URL" />

	<q-btn @click="saveSettings()" color="primary" label="Save" />
</template>

<style scoped></style>
