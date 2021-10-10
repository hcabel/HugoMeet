import React, {useState} from "react";

import "./landingPageCSS.css"

import Presentation_1_Img from "./assets/Presentation_1_Img.svg"
import Presentation_2_Img from "./assets/Presentation_2_Img.svg"
import Presentation_3_Img from "./assets/Presentation_3_Img.svg"
import Presentation_4_Img from "./assets/Presentation_4_Img.svg"

const	PresentationPhotos = [
	Presentation_1_Img,
	Presentation_2_Img,
	Presentation_3_Img,
	Presentation_4_Img
];
const	PresentationTitle = [
	"Obtenir un lien de partage",
	"Voir tout le monde",
	"Planifier et anticiper",
	"Votre réunion est sécurisée"
];
const	PresentationText = [
	"Cliquez sur Nouvelle réunion pour obtenir le lien à envoyer aux personnes que vous souhaitez inviter à une réunion",
	"Pour pouvoir afficher un plus grand nombre de personnes simultanément accédez au menu Autres options et sélectionnez Modifier la disposition",
	"Cliquez sur Nouvelle réunion pour planifier des réunions dans Google Agenda et envoyer des invitations aux participants",
	"Personne ne peut rejoindre une réunion sans y avoir été invité ou admis par l'organisateur"
];

export default function LandingPage()
{
	const [_PresentationIndex, set_PresentationIndex] = useState(0);
	const [_Value, set_Value] = useState("");
	const [_Focused, set_Focused] = useState(false);

	return (
		<div className="LandingPage">
			<div className="LP-Header">

			</div>
			<div className="LP-Body">
				<div className="LP-B-TextAndButton">
					<div className="LP-B-TAB-Text">
						La visioconférence haute qualité, maintenant disponible pour tous
					</div>
					<div className="LP-B-TAB-Text2">
						Nous avons adapté Google Meet, notre service de visioconférence professionnel sécurisé, afin de le rendre disponible pour tous.
					</div>
					<div className="LP-B-TAB-Button">
						<div className="LP-B-TAB-B-CreateNewRoom">
							<div className="LP-B-TAB-B-CNR-Img"></div>
							<div className="LP-B-TAB-B-CNR-Text">
								Nouvelle réunion
							</div>
						</div>
						<div className="LP-B-TAB-B-JoinRoom">
							<label className="LP-B-TAB-B-JR-Label">
								<div className="LP-B-TAB-B-JR-L-Img"></div>
								<input className="LP-B-TAB-B-JR-L-Input"
									type="text"
									value={_Value}
									autoComplete="off"
									id="i3"
									aria-controls="i4"
									aria-describedby="i4"
									placeholder="Saisir un code ou un lien"
									spellCheck="false"
									maxLength="50"
									onChange={(e) => set_Value(e.target.value)}
									onFocus={() => set_Focused(true)}
									onBlur={() => set_Focused(false)}
								>
								</input>
							</label>
							{(_Focused || _Value.length > 0) &&
								<button className="LP-B-TAB-B-JR-Button" style={{ color: (_Value.length > 0 ? "#1a73e8" : "rgba(60,64,67,0.38)")}}>
									Participer
								</button>
							}
						</div>
					</div>
					<div className="LP-B-TAB-HR"></div>
					<div class="LP-B-TAB-MoreInfos">
						<span class="LP-B-TAB-MI-Span">
							<a className="LP-B-TAB-MI-S-Href" href="https://www.youtube.com/channel/UCuKL6gBO82AEBAFc5lWJQFg">En savoir plus</a> sur Google&nbsp;Meet
						</span>
					</div>
				</div>
				<div className="LP-B-ImgList">
					<div className="LP-B-IL-Content">
						<button className="LP-B-IL-C-ButtonLeft" onClick={() => set_PresentationIndex(_PresentationIndex - 1)} disabled={(_PresentationIndex <= 0)}>
							<svg width="24" height="24" viewBox="0 0 24 24" focusable="false" class="LP-B-IL-C-BL-Arrow">
								<path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12l4.58-4.59z"></path>
							</svg>
						</button>
						<div className="LP-B-IL-C-Content">
							<div className="LP-B-IL-C-C-TextImage">
								<img alt="presentation images" src={PresentationPhotos[_PresentationIndex]} ></img>
								<div className="LP-B-IL-C-C-TI-text">
									<div className="LP-B-IL-C-C-TI-T-Title">
										{PresentationTitle[_PresentationIndex]}
									</div>
									<div className="LP-B-IL-C-C-TI-T-Text">
										{PresentationText[_PresentationIndex]}
									</div>
								</div>
							</div>
						</div>
						<button className="LP-B-IL-C-ButtonRight" onClick={() => set_PresentationIndex(_PresentationIndex + 1)} disabled={(_PresentationIndex >= 3)}>
						<svg width="24" height="24" viewBox="0 0 24 24" focusable="false" class="LP-B-IL-C-BR-Arrow">
							<path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"></path>
						</svg>
						</button>
					</div>
					<div className="LP-B-IL-IndexList">
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 0 ? "CurrentItem" : "")}></div>
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 1 ? "CurrentItem" : "")}></div>
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 2 ? "CurrentItem" : "")}></div>
						<div className={"LP-B-IL-IL-Item " + (_PresentationIndex === 3 ? "CurrentItem" : "")}></div>
					</div>
				</div>
			</div>
		</div>
	);
}
