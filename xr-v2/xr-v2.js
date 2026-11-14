(() => {
  "use strict";
  // XR V2-specific enhancements. All original publication and site functionality
  // stays in the existing ../index.js without modifications.
  const buttons = [...document.querySelectorAll("[data-xr-stage]")];
  const graphNodes = [...document.querySelectorAll("[data-map-node]")];
  const index = document.querySelector("#xr-v2-stage-index");
  const heading = document.querySelector("#xr-v2-stage-title");
  const description = document.querySelector("#xr-v2-stage-description");
  const link = document.querySelector("#xr-v2-stage-link");
  const steps = {
    sense: {
      index: "01 / SPATIAL PERCEPTION",
      heading: "Interpret the physical world",
      description: "Characterize XR and ADAS workloads using sensing, tracking, RGB/event data and sensor fusion before making hardware decisions.",
      href: "#focus",
      label: "Explore perception research ↗"
    },
    compute: {
      index: "02 / AI ACCELERATION",
      heading: "Adaptive AI compute",
      description: "Precision-aware SIMD datapaths, CORDIC arithmetic, and digital CIM engines map perception workloads onto efficient accelerator hardware.",
      href: "#silicon",
      label: "Explore silicon systems ↗"
    },
    integrate: {
      index: "03 / SYSTEM INTEGRATION",
      heading: "Design the deployable system",
      description: "Connect accelerators to RISC-V SoCs, on-chip memory, interconnect and software-aware execution to balance energy, throughput and real-time requirements.",
      href: "#about",
      label: "Explore system architecture ↗"
    }
  };
  const selectStage = key => {
    const stage = steps[key];
    if (!stage) return;
    buttons.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.xrStage === key)));
    graphNodes.forEach(node => node.classList.toggle("active", node.dataset.mapNode === key));
    index.textContent = stage.index;
    heading.textContent = stage.heading;
    description.textContent = stage.description;
    link.textContent = stage.label;
    link.setAttribute("href", stage.href);
  };
  buttons.forEach((button, i) => {
    button.addEventListener("click", () => selectStage(button.dataset.xrStage));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const target = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        (i + (event.key === "ArrowLeft" ? -1 : 1) + buttons.length) % buttons.length;
      buttons[target].focus();
      selectStage(buttons[target].dataset.xrStage);
    });
  });
  selectStage("compute");

  // Keeps existing scene depth setting authoritative for all V2 motion.
  const syncMotion = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const enabled = document.body.dataset.spatial !== "off" && !reduce;
    document.body.classList.toggle("xr-v2-motion-on", enabled);
  };
  syncMotion();
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", syncMotion);
  const spatialToggle = document.querySelector(".spatial-toggle");
  spatialToggle?.addEventListener("click", syncMotion);

  // Permit the user to compare versions while staying on the preview path.
  const previewLabel = document.querySelector(".xr-v2-preview-bar");
  previewLabel?.setAttribute("title", "Separate preview. Original site remains at the home URL.");
})();
