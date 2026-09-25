import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
// The printer: a condensed thermal mono, and dot matrix for its big numbers.
import "@fontsource-variable/martian-mono/wdth.css";
import "@fontsource/doto/latin-900.css";
// The pen: a real ballpoint hand.
import "@fontsource/nanum-pen-script/latin-400.css";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
