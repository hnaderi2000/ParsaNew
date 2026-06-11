import { InfinitySpin } from "react-loader-spinner";
function Loader() {
  return (
    <div
      style={{
        margin: "0px auto",
        width: "fit-content",
        height: "fit-content",
      }}
    >
      <InfinitySpin
        visible={true}
        color="var(--blue)"
        ariaLabel="infinity-spin-loading"
      />
    </div>
  );
}

export default Loader;
