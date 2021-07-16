import "./links.css";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { library, dom } from "@fortawesome/fontawesome-svg-core";

const links = document.createElement("div");
links.id = "links";
links.innerHTML =
  '<a href="https://github.com/rossning92/head-tracked-3d" target="_blank"><i class="fab fa-github"></i> Source</a> | rossning92';
document.body.append(links);

library.add(faGithub);
dom.watch();
