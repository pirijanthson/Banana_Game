import "./BananaBackground.css";

const BANANA_IMAGE_URL = "/banana.svg";

function BananaBackground() {
  return (
    <div className="banana-background" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((banana) => (
        <img
          key={banana}
          src={BANANA_IMAGE_URL}
          alt=""
          className={`banana-background__image banana-background__image--${banana}`}
        />
      ))}
    </div>
  );
}

export default BananaBackground;
