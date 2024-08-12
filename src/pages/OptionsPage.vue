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

	// register content script whenever we save the url
	if (url.value.length) {
		await $q.bex.send('tabNotification.register', {
			url: url.value,
		});
	}

	$q.notify({
		type: 'positive',
		message: 'Settings saved',
	});
}
</script>

<template>
	<div class="options">
		<header>
			<img src="icons/favicon-128x128.png" />

			<h1 class="text-h4">YouNotify</h1>
		</header>

		<main>
			<q-form @submit="saveSettings()">
				<div class="youtrackOptions">
					<q-input
						v-model="token"
						label="YouTrack Token"
						placeholder="perm:123456789"
						lazy-rules
						:rules="[(val) => val?.length || 'Required']"
					/>

					<q-input
						v-model="url"
						label="YouTrack URL"
						placeholder="bugs.something.com"
						lazy-rules
						:rules="[(val) => val?.length || 'Required']"
					/>

					<q-btn color="primary" label="Save" type="submit" />
				</div>
			</q-form>
		</main>
	</div>
</template>

<style scoped lang="scss">
.options {
	padding: 1rem;
	display: flex;
	flex-direction: column;
	gap: 4rem;
}

header {
	display: flex;
	align-items: center;
	gap: 2rem;
}

.youtrackOptions {
	display: flex;
	flex-direction: column;
	gap: 1rem;

	max-width: 30rem;

	button {
		align-self: flex-end;
	}
}
</style>
