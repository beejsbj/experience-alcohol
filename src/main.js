import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@fontsource-variable/bodoni-moda/opsz-italic.css";
import "@fontsource-variable/bodoni-moda/opsz.css";
import "@fontsource/anton/400.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
