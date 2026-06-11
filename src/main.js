import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/fraunces/500-italic.css";
import "@fontsource/fraunces/700-italic.css";
import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "./assets/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
