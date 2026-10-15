<!-- eslint-disable no-mixed-spaces-and-tabs -->
<template>
	<div id="app">
		<div class="view login" v-if="state.username === '' || state.username === null">
			<form class="login-card" @submit.prevent="Login">
				<div class="brand-mark">
					<span></span><span></span><span></span>
				</div>
				<h1>SCADA Control</h1>
				<p class="subtitle">Live demo data. Enter a name to join the control room.</p>
				<label for="username">Operator name</label>
				<input
					id="username"
					type="text"
					v-model="inputUsername"
					autocomplete="off"
					placeholder="e.g. Alex" />
				<input
					type="submit"
					class="btn-primary"
					value="Enter control room" />
			</form>
		</div>

		<div class="view dashboard" v-else>
			<header class="topbar">
				<div class="brand">
					<div class="brand-mark small">
						<span></span><span></span><span></span>
					</div>
					<span class="brand-name">SCADA Control</span>
					<span class="live-pill"><i></i>Live</span>
				</div>
				<div class="user">
					<span class="avatar">{{ state.username.charAt(0).toUpperCase() }}</span>
					<span class="user-name">{{ state.username }}</span>
					<button type="button" class="btn-ghost" @click="Logout">Log out</button>
				</div>
			</header>

			<main class="content">
				<div class="alert-overheat" v-if="this.overHeat">
					<div>
						<strong>Over heat detected</strong>
						<span>All pumps have been running at full power. Shut down to protect the system.</span>
					</div>
					<button type="button" class="btn-danger" @click="emergencyAction()">Shut down system</button>
				</div>

				<div class="grid">
					<section class="card controls">
						<div class="card-head">
							<h2>Controls</h2>
							<span class="muted">Tap to toggle</span>
						</div>
						<div class="control-groups">
							<div class="control-group">
								<h3>Pumps</h3>
								<button
									v-for="n in 4"
									:key="'valve' + n"
									class="toggle"
									:class="{ on: $data['valve_' + n + '_active'] }"
									:value="'valve_' + n + '_active'"
									@click="setStatus($event)">Valve #{{ n }}</button>
							</div>
							<div class="control-group">
								<h3>Release</h3>
								<button
									v-for="n in 4"
									:key="'release' + n"
									class="toggle"
									:class="{ on: $data['release_' + n + '_active'] }"
									:value="'release_' + n + '_active'"
									@click="setStatus($event)">Release #{{ n }}</button>
							</div>
						</div>
					</section>

					<section class="card gauges">
						<div class="card-head">
							<h2>Power</h2>
							<span class="muted">% of capacity</span>
						</div>
						<div class="gauge-row">
							<div class="gauge">
								<vue-gauge :refid="'type-unique-id-1'" :options="pumpOptions" :key="pumpValue"></vue-gauge>
								<span class="gauge-label">Pump</span>
							</div>
							<div class="gauge">
								<vue-gauge :refid="'type-unique-id-2'" :options="releaseOptions" :key="releaseValue"></vue-gauge>
								<span class="gauge-label">Release</span>
							</div>
						</div>
					</section>

					<section class="card activity">
						<div class="card-head">
							<h2>Activity</h2>
							<span class="muted">Latest 5</span>
						</div>
						<ul class="timeline" v-if="backlogData.length != 0">
							<li v-for="data in backlogData" :key="data.id">
								<span class="dot"></span>
								<div>
									<div class="event"><strong>{{ formatAction(data.actionWith) }}</strong> toggled by {{ data.username }}</div>
									<div class="time">{{ data.modifiedAt }}</div>
								</div>
							</li>
						</ul>
						<div v-else class="empty">No activity yet</div>
					</section>

					<section class="card chat">
						<div class="card-head">
							<h2>Team chat</h2>
							<span class="muted">{{ state.messages.length }} messages</span>
						</div>
						<div class="messages">
							<div
								v-for="message in state.messages"
								:key="message.id"
								:class="(message.username == state.username ? 'message current-user' : 'message')">
								<div class="username">{{ message.username }}</div>
								<div class="bubble">{{ message.content }}</div>
							</div>
							<div v-if="state.messages.length === 0" class="empty">No messages yet. Say hello.</div>
						</div>
						<form class="composer" @submit.prevent="SendMessage">
							<input
								type="text"
								v-model="inputMessage"
								placeholder="Write a message..." />
							<input
								type="submit"
								class="btn-primary"
								value="Send" />
						</form>
					</section>
				</div>
			</main>
		</div>
	</div>
</template>

<script>
import { reactive, onMounted, ref } from 'vue';
import db from './db';
import VueGauge from 'vue-gauge';
import moment from 'moment';

export default {
	components: { VueGauge },
	data() {
		return {
			valveReleaseList: [
				"valve_1_active",
				"valve_2_active",
				"valve_3_active",
				"valve_4_active",
				"release_1_active",
				"release_2_active",
				"release_3_active",
				"release_4_active",
			],
			backlog: [],
			valve_1_active: false,
			valve_2_active: false,
			valve_3_active: false,
			valve_4_active: false,
			release_1_active: false,
			release_2_active: false,
			release_3_active: false,
			release_4_active: false,
			defaultPowerPercent: 25,
			overHeat: false,
			countDown: 0,
			timer: null,
		}
	},
	computed: {
		backlogData() {
			return this.backlog.length < 5 ? this.backlog : this.backlog.slice(1).slice(-5);
		},
		pumpValue() {
			let result = 0;
			let totalPumpActive = 0;
			this.valveReleaseList.forEach(e => {
				if (e.includes("valve") && this[e]) {
					totalPumpActive ++;
				}
			})

			result = this.defaultPowerPercent * totalPumpActive;

			return result;
		},
		pumpOptions() {
			return this.gaugeOptions(this.pumpValue);
		},
		releaseValue() {
			let result = 0;
			let totalReleaseActive = 0;
			this.valveReleaseList.forEach(e => {
				if (e.includes("release") && this[e]) {
					totalReleaseActive ++;
				}
			})

			result = this.defaultPowerPercent * totalReleaseActive;

			return result;
		},
		releaseOptions() {
			return this.gaugeOptions(this.releaseValue);
		}
	},
	mounted() {
		const backlogRef = db.database().ref("backlog");
		backlogRef.on('value', snapshot => {
			const data = snapshot.val() ?? "";
			let backlog = [];
			Object.keys(data).forEach(key => {
			backlog.push({
				id: key,
				username: data[key].username,
				actionWith: data[key].actionWith,
				modifiedAt: data[key].modifiedAt
			});
			});
			this.backlog = backlog;
		});

		const overHearRef = db.database().ref("overHeat");
		overHearRef.on('value', snapshot => {
			const data = snapshot.val() ?? "";
			let backlog = [];
			Object.keys(data).forEach(key => {
			backlog.push({
				id: key,
				username: data[key].username,
				overHeat: data[key].overHeat,
				modifiedAt: data[key].modifiedAt
			});
			});
			this.overHeat = backlog.pop()?.overHeat ?? false;
		});

		this.valveReleaseList.forEach(el => {
			const elRef = db.database().ref(el);
			elRef.on('value', snapshot => {
				const data = snapshot.val() ?? "";
				let backlog = [];
				Object.keys(data).forEach(key => {
					backlog.push({
						id: key,
						username: data[key].username,
						status: data[key].status
					});
				});
				this[el] = backlog.pop()?.status ?? false;
			});
		})
	},
	watch: {
		pumpValue() {
			if (this.pumpValue === 100) {
				this.startCountDown();
			}
		},
		countDown() {
			if (this.countDown === 10) {
				this.overHeat = true;
				this.stopCountDown();
			}
		},
		overHeat() {
			this.saveOverHeat();
		}
	},
	methods: {
		formatAction(action) {
			// Bulk actions log keys like "valve_4_active"; show them as "Valve #4"
			const match = /^(valve|release)_(\d+)_active$/.exec(action ?? "");
			if (!match) return action;
			return `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)} #${match[2]}`;
		},
		gaugeOptions(value) {
			return {
				hasNeedle: true,
				needleValue: value,
				needleColor: '#e2e8f0',
				arcColors: ['#22c55e', '#eab308', '#f97316', '#ef4444'],
				arcDelimiters: [25, 50, 75],
				arcPadding: 4,
				arcPaddingColor: '#111827',
				arcOverEffect: false,
				rangeLabel: ['0', '100'],
				labelsFont: 'Inter, sans-serif',
				chartWidth: 220,
				needleStartValue: value,
				centralLabel: value.toString(),
			}
		},
		setStatus(e, bulkAction = false) {
			if (!bulkAction) {
				this[e.target.value] = !this[e.target.value];
			}
			var current = moment().format("DD/MM/YYYY hh:mm:ss a").toString();
			const statusRef = db.database().ref(bulkAction ? e : e.target.value.toString());
			const status = {
				username: this.state.username,
				status: this[bulkAction ? e : e.target.value],
				modifiedAt: current
			}
			statusRef.push(status);
			this.saveBacklog(bulkAction ? e : e.target.innerHTML.toString(), current);
		},
		saveBacklog(actionWith, current) {
			const logRef = db.database().ref("backlog");
			const log = {
				username: this.state.username,
				actionWith: actionWith,
				modifiedAt: current
			}
			logRef.push(log);
		},
		saveOverHeat() {
			var current = moment().format("DD/MM/YYYY hh:mm:ss a").toString();
			const overHeatRef = db.database().ref("overHeat");
			const status = {
				username: this.state.username,
				overHeat: this.overHeat,
				modifiedAt: current
			}
			overHeatRef.push(status);
		},
		emergencyAction() {
			this.valveReleaseList.forEach(e => {
				if (e.includes("valve")) {
					this[e] = false;
					this.setStatus(e, true);
				}

				if (e.includes("release")) {
					this[e] = true;
					this.setStatus(e, true);
				}
			});
			this.overHeat = false;
			this.saveOverHeat();
		},
		startCountDown() {
			this.timer = setInterval( () => {
				this.countDown ++;
			}, 1000);
		},
		stopCountDown() {
			clearInterval(this.timer);
			this.countDown = 0;
		}
	},
	setup() {
		const inputUsername = ref("");
		const inputMessage = ref("");

		const state = reactive({
			username: "",
			messages: []
		});

		const Login = () => {
			if (inputUsername.value != "" || inputUsername.value != null) {
				state.username = inputUsername.value;
				inputUsername.value = "";
			}
		}

		const Logout = () => {
			state.username = "";
		}

		const SendMessage = () => {
		const messagesRef = db.database().ref("messages");

		if (inputMessage.value === "" || inputMessage.value === null) {
			return;
		}

		const message = {
			username: state.username,
			content: inputMessage.value
		}

		messagesRef.push(message);
			inputMessage.value = "";
		}

		onMounted(() => {
			const messagesRef = db.database().ref("messages");
			messagesRef.on('value', snapshot => {
				const data = snapshot.val() ?? "";
				let messages = [];
				Object.keys(data).forEach(key => {
				messages.push({
					id: key,
					username: data[key].username,
					content: data[key].content
				});
				});
				state.messages = messages;
			});
		});

		return {
			inputUsername,
			Login,
			state,
			inputMessage,
			SendMessage,
			Logout
		}
	}
}
</script>



<style lang="scss">
	:root {
		--bg: #0b1120;
		--surface: #111827;
		--surface-2: #1f2937;
		--border: rgba(148, 163, 184, 0.14);
		--text: #e2e8f0;
		--muted: #94a3b8;
		--accent: #22d3ee;
		--accent-strong: #06b6d4;
		--on: #22c55e;
		--danger: #ef4444;
		--radius: 16px;
	}

	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	html, body {
		background: var(--bg);
	}

	#app {
		font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
		color: var(--text);
		min-height: 100vh;
		background:
			radial-gradient(1200px 600px at 10% -10%, rgba(34, 211, 238, 0.12), transparent 60%),
			radial-gradient(900px 500px at 110% 10%, rgba(99, 102, 241, 0.10), transparent 60%),
			var(--bg);
	}

	button, input {
		font: inherit;
		color: inherit;
	}

	input[type="text"] {
		appearance: none;
		width: 100%;
		padding: 12px 14px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: rgba(15, 23, 42, 0.8);
		color: var(--text);
		outline: none;
		transition: border-color .2s, box-shadow .2s;

		&::placeholder {
			color: #64748b;
		}

		&:focus {
			border-color: var(--accent);
			box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.2);
		}
	}

	.btn-primary {
		appearance: none;
		border: none;
		cursor: pointer;
		padding: 12px 18px;
		border-radius: 10px;
		font-weight: 600;
		color: #04111a;
		background: linear-gradient(135deg, var(--accent), var(--accent-strong));
		transition: transform .15s, filter .15s;

		&:hover { filter: brightness(1.08); }
		&:active { transform: translateY(1px); }
	}

	.btn-ghost {
		appearance: none;
		cursor: pointer;
		padding: 8px 14px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--muted);
		font-size: 14px;
		transition: color .15s, border-color .15s;

		&:hover {
			color: var(--text);
			border-color: rgba(148, 163, 184, 0.4);
		}
	}

	.btn-danger {
		appearance: none;
		border: none;
		cursor: pointer;
		padding: 10px 18px;
		border-radius: 10px;
		font-weight: 600;
		color: #fff;
		background: var(--danger);
		white-space: nowrap;

		&:hover { filter: brightness(1.1); }
	}

	.muted {
		color: var(--muted);
		font-size: 13px;
	}

	.empty {
		color: var(--muted);
		font-size: 14px;
		text-align: center;
		padding: 24px 0;
	}

	.brand-mark {
		display: inline-flex;
		align-items: flex-end;
		gap: 4px;
		height: 40px;
		padding: 8px;
		border-radius: 12px;
		background: rgba(34, 211, 238, 0.12);
		border: 1px solid rgba(34, 211, 238, 0.3);

		span {
			width: 6px;
			border-radius: 2px;
			background: var(--accent);
			&:nth-child(1) { height: 40%; }
			&:nth-child(2) { height: 100%; }
			&:nth-child(3) { height: 65%; }
		}

		&.small {
			height: 32px;
			padding: 6px;
			span { width: 5px; }
		}
	}

	.view.login {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;

		.login-card {
			width: 100%;
			max-width: 400px;
			padding: 36px 32px;
			border-radius: 20px;
			background: rgba(17, 24, 39, 0.85);
			border: 1px solid var(--border);
			box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
			backdrop-filter: blur(8px);

			h1 {
				font-size: 26px;
				font-weight: 700;
				margin: 20px 0 6px;
			}

			.subtitle {
				color: var(--muted);
				font-size: 14px;
				margin-bottom: 28px;
			}

			label {
				display: block;
				font-size: 13px;
				font-weight: 500;
				color: var(--muted);
				margin-bottom: 8px;
			}

			input[type="text"] {
				margin-bottom: 16px;
			}

			.btn-primary {
				width: 100%;
			}
		}
	}

	.view.dashboard {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.topbar {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 24px;
		background: rgba(11, 17, 32, 0.8);
		border-bottom: 1px solid var(--border);
		backdrop-filter: blur(10px);

		.brand {
			display: flex;
			align-items: center;
			gap: 12px;
		}

		.brand-name {
			font-weight: 700;
			font-size: 17px;
		}

		.user {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.avatar {
			display: grid;
			place-items: center;
			width: 32px;
			height: 32px;
			border-radius: 50%;
			font-weight: 600;
			font-size: 14px;
			color: #04111a;
			background: linear-gradient(135deg, var(--accent), #818cf8);
		}

		.user-name {
			font-size: 14px;
			font-weight: 500;
		}
	}

	.live-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px;
		border-radius: 999px;
		font-size: 12px;
		font-weight: 600;
		color: var(--on);
		background: rgba(34, 197, 94, 0.12);
		border: 1px solid rgba(34, 197, 94, 0.3);

		i {
			width: 7px;
			height: 7px;
			border-radius: 50%;
			background: var(--on);
			animation: pulse 2s ease-in-out infinite;
		}
	}

	.content {
		flex: 1;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 24px;
	}

	.alert-overheat {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 20px;
		margin-bottom: 20px;
		border-radius: var(--radius);
		background: rgba(239, 68, 68, 0.12);
		border: 1px solid rgba(239, 68, 68, 0.5);
		animation: glow 1.2s ease-in-out infinite;

		strong {
			display: block;
			color: #fca5a5;
			margin-bottom: 2px;
		}

		span {
			color: var(--muted);
			font-size: 14px;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: 20px;

		.controls { grid-column: span 4; }
		.gauges { grid-column: span 4; }
		.activity { grid-column: span 4; }
		.chat { grid-column: span 12; }
	}

	.card {
		min-width: 0;
		padding: 20px;
		border-radius: var(--radius);
		background: rgba(17, 24, 39, 0.85);
		border: 1px solid var(--border);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);

		.card-head {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			margin-bottom: 18px;

			h2 {
				font-size: 16px;
				font-weight: 600;
			}
		}
	}

	.control-groups {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.control-group {
		display: flex;
		flex-direction: column;
		gap: 10px;

		h3 {
			font-size: 12px;
			font-weight: 600;
			letter-spacing: .08em;
			text-transform: uppercase;
			color: var(--muted);
			margin-bottom: 2px;
		}
	}

	.toggle {
		position: relative;
		appearance: none;
		cursor: pointer;
		text-align: left;
		padding: 12px 14px 12px 34px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface-2);
		color: var(--muted);
		font-size: 14px;
		font-weight: 500;
		transition: background .2s, border-color .2s, color .2s;

		&::before {
			content: "";
			position: absolute;
			left: 14px;
			top: 50%;
			width: 9px;
			height: 9px;
			margin-top: -4.5px;
			border-radius: 50%;
			background: #475569;
			transition: background .2s, box-shadow .2s;
		}

		&:hover {
			border-color: rgba(148, 163, 184, 0.4);
			color: var(--text);
		}

		&.on {
			color: var(--text);
			background: rgba(34, 197, 94, 0.12);
			border-color: rgba(34, 197, 94, 0.45);

			&::before {
				background: var(--on);
				box-shadow: 0 0 10px var(--on);
			}
		}
	}

	.gauge-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.gauge {
		display: flex;
		flex-direction: column;
		align-items: center;

		.gauge-label {
			margin-top: 4px;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: .08em;
			text-transform: uppercase;
			color: var(--muted);
		}

		svg text {
			fill: var(--muted);
		}
	}

	.timeline {
		list-style: none;

		li {
			position: relative;
			display: flex;
			gap: 12px;
			padding-bottom: 16px;

			&:not(:last-child)::after {
				content: "";
				position: absolute;
				left: 4px;
				top: 14px;
				bottom: 0;
				width: 1px;
				background: var(--border);
			}
		}

		.dot {
			flex: none;
			width: 9px;
			height: 9px;
			margin-top: 5px;
			border-radius: 50%;
			background: var(--accent);
			box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
		}

		.event {
			font-size: 14px;
			color: var(--muted);

			strong {
				color: var(--text);
				font-weight: 600;
			}
		}

		.time {
			font-size: 12px;
			color: #64748b;
			margin-top: 2px;
		}
	}

	.chat {
		display: flex;
		flex-direction: column;

		.messages {
			max-height: 360px;
			overflow-y: auto;
			display: flex;
			flex-direction: column;
			gap: 12px;
			padding-right: 4px;
			margin-bottom: 16px;
		}

		.message {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			max-width: 75%;

			.username {
				font-size: 12px;
				color: var(--muted);
				margin: 0 4px 4px;
			}

			.bubble {
				padding: 10px 14px;
				border-radius: 14px 14px 14px 4px;
				background: var(--surface-2);
				font-size: 15px;
				line-height: 1.4;
				word-break: break-word;
			}

			&.current-user {
				align-self: flex-end;
				align-items: flex-end;

				.bubble {
					border-radius: 14px 14px 4px 14px;
					color: #04111a;
					font-weight: 500;
					background: linear-gradient(135deg, var(--accent), var(--accent-strong));
				}
			}
		}

		.composer {
			display: flex;
			gap: 10px;
		}
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: .35; }
	}

	@keyframes glow {
		0%, 100% { box-shadow: 0 0 0 rgba(239, 68, 68, 0); }
		50% { box-shadow: 0 0 24px rgba(239, 68, 68, 0.45); }
	}

	@media (max-width: 1024px) {
		.grid {
			.controls, .gauges { grid-column: span 6; }
			.activity { grid-column: span 12; }
		}
	}

	@media (max-width: 720px) {
		.topbar {
			padding: 12px 16px;
			.user-name, .live-pill { display: none; }
		}

		.content { padding: 16px; }

		.grid {
			gap: 16px;
			.controls, .gauges, .activity, .chat { grid-column: span 12; }
		}

		.alert-overheat {
			flex-direction: column;
			align-items: stretch;
		}

		.chat .message { max-width: 90%; }
	}
</style>
