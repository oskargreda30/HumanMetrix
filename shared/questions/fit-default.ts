import type { FITQuestion } from './types';

export const FIT_QUESTIONS_DEFAULT: FITQuestion[] = [
  {
    id: "1",
    text: "You are hosting a dinner party. A key ingredient is missing, and the stores are about to close.",
    options: [
      { value: "A", text: "Quickly change the recipe to use only what's on hand and start cooking immediately, focusing on saving time." },
      { value: "B", text: "Call a foodie friend to find the most interesting, surprising thing you could use to replace the missing ingredient." },
      { value: "C", text: "Take a few minutes to quickly look up advanced techniques for making the dish work with fewer ingredients, viewing it as a new skill challenge." },
      { value: "D", text: "Send a quick text to guests to see if one is passing a store and can grab the item, offering to pay them back." },
    ],
  },
  {
    id: "2",
    text: "A friend tells you they failed their driving test for the third time and are deeply upset.",
    options: [
      { value: "A", text: "Proactively schedule structured driving practice sessions and take responsibility for coaching their weakest areas until measurable improvement occurs." },
      { value: "B", text: "Remind them that failure is normal and encourage them to take a short break before getting back to their routine." },
      { value: "C", text: "Focus entirely on validating their frustration and offer to listen as long as they need, avoiding judgment or practical advice." },
      { value: "D", text: "Suggest setting up practice sessions with several different, patient friends to get varied feedback and make the process more fun." },
    ],
  },
  {
    id: "3",
    text: "You are trying to repair a small, complicated piece of antique furniture, and the original instructions are in an unfamiliar language.",
    options: [
      { value: "A", text: "Focus time on translating the original documents and researching the specific construction methods used during that time period." },
      { value: "B", text: "Accept that it will take longer, and start working on the simpler parts first, slowly tackling the hardest piece last." },
      { value: "C", text: "Find a highly specialized artisan in the field and offer them a fair price just to explain the key technique needed for the fix." },
      { value: "D", text: "Enrol in a weekend class on that specific period of furniture restoration, seeing it as a long-term investment." },
    ],
  },
  {
    id: "4",
    text: "You plan a vacation with three friends, but two of them suddenly refuse to pay the agreed-upon deposit, threatening the whole trip.",
    options: [
      { value: "A", text: "Personally secure the required deposit through a short-term arrangement to prevent the trip from collapsing, then address the commitment issue privately." },
      { value: "B", text: "Analyse the detailed cancellation rules and timeline for the trip to understand exactly what options are available if the friends drop out completely." },
      { value: "C", text: "Politely tell the travel agent that the trip might need to be delayed or cancelled, focusing on protecting your own financial stability first." },
      { value: "D", text: "Work with the travel agent to restructure the booking so it proceeds only with the confirmed participants, adapting the plan to the new social reality." },
    ],
  },
  {
    id: "5",
    text: "You see an older person on the pavement struggling to carry several heavy grocery bags.",
    options: [
      { value: "A", text: "Step in and ask which bags are heaviest so you can take on the most physically demanding ones." },
      { value: "B", text: "Offer to help carry the bags and walk with them, ensuring they feel supported until they reach their destination." },
      { value: "C", text: "Take the initiative to carry all the bags yourself, offering to help them all the way home." },
      { value: "D", text: "Ask a nearby passerby to help as well, dividing the load among several people to make it easier." },
    ],
  },
  {
    id: "6",
    text: "You have been running a personal blog/creative project for years, and a long-time reader posts a detailed, hateful critique of your recent work.",
    options: [
      { value: "A", text: "Write and publish a point-by-point factual response that defends your creative choices and corrects any misinterpretations in the critique." },
      { value: "B", text: "Take the negative critique as a challenge and immediately start seeking mentorship or courses to improve the specific flaws mentioned." },
      { value: "C", text: "Reach out privately to several other readers to find out if the critique has merit and coordinate a group response to the public comment." },
      { value: "D", text: "Delete the hateful comment and decide to continue working on your project exactly as before, focusing on the joy of creating." },
    ],
  },
  {
    id: "7",
    text: "A close friend asks you to co-sign a lease or loan for a business idea you believe is fundamentally flawed and risky.",
    options: [
      { value: "A", text: "Research the legal requirements of co-signing and the friend's financial history to gather objective data on the exact risks involved." },
      { value: "B", text: "Politely refuse the request, citing your own current financial stress and the need to protect your future stability." },
      { value: "C", text: "Agree to help the friend, but only on the condition that they complete a business course and secure a mentor before you sign." },
      { value: "D", text: "Tell the friend you cannot co-sign, but immediately offer them a smaller, non-repayable loan to help with initial start-up costs." },
    ],
  },
  {
    id: "8",
    text: "You discover your local volunteer group's election process is accidentally confusing, leading to only wealthy, older members being elected.",
    options: [
      { value: "A", text: "Immediately draft and circulate a new, simpler election form and host a pop-up station to help every member register correctly." },
      { value: "B", text: "Spend time analysing the old form and historical voter data to pinpoint exactly which sections created the subtle barrier to entry." },
      { value: "C", text: "Offer dedicated time to reach out to younger, less wealthy members and ensure they are personally guided through the registration process." },
      { value: "D", text: "Propose a rule change that mandates training for all potential candidates, ensuring everyone starts with the same knowledge base." },
    ],
  },
  {
    id: "9",
    text: "You are at a live concert when a person nearby begins talking loudly and disrupting the experience for those around you.",
    options: [
      { value: "A", text: "Stay focused on the performance, adjusting your position if needed, waiting for the situation to resolve itself." },
      { value: "B", text: "Lean over and politely mention that you're finding it hard to hear, expressing understanding that they might not realise the impact." },
      { value: "C", text: "Quietly get the attention of a nearby usher and let them handle the situation professionally." },
      { value: "D", text: "Clearly but firmly ask the person to lower their voice so everyone nearby can enjoy the show." },
    ],
  },
  {
    id: "10",
    text: "During heavy rain, you discover water leaking through your ceiling, indicating roof damage that needs urgent attention.",
    options: [
      { value: "A", text: "Immediately place containers to catch water, move valuables, and start calling emergency roofers to assess the damage." },
      { value: "B", text: "Document the damage with photos and research what temporary measures prevent mould while waiting for professional help." },
      { value: "C", text: "Use this as motivation to learn basic home maintenance skills, starting with understanding how roof repairs work for future preparedness." },
      { value: "D", text: "Stay calm, then reach out to trusted neighbours or family members who may know reliable emergency repair services." },
    ],
  },
  {
    id: "11",
    text: "Your close-knit group of friends has developed an inside joke or ritual that consistently leaves one specific member feeling excluded.",
    options: [
      { value: "A", text: "Immediately confront the main instigator privately, demanding that they stop the joke/ritual for the sake of the group dynamic." },
      { value: "B", text: "Observe the group interactions closely for a week, logging exactly when the exclusion happens to determine its root cause." },
      { value: "C", text: "Stop participating in the joke/ritual yourself and ensure the excluded friend is included in other, separate activities you plan." },
      { value: "D", text: "Initiate a casual conversation with the entire group, suggesting a completely new, shared activity or joke that everyone can enjoy equally." },
    ],
  },
  {
    id: "12",
    text: "You need to organize a huge, complex family reunion in a few weeks, and you have no clear plan or starting budget.",
    options: [
      { value: "A", text: "Spend the first day breaking the event into 100 small, dependent tasks (invites, menu, travel) to create a concrete, manageable checklist." },
      { value: "B", text: "Communicate clearly to the main family contact that the time frame is impossible and propose a revised, achievable schedule for next year." },
      { value: "C", text: "Find an event planner or experienced family member who has successfully done this before and ask for their advice on how to structure the starting phase." },
      { value: "D", text: "Identify two capable family members and delegate the non-critical initial tasks (like creating the guest list) while defining the core budget." },
    ],
  },
  {
    id: "13",
    text: "You are stuck on a difficult personal challenge and need a solution quickly.",
    options: [
      { value: "A", text: "Secure an appropriate external solution to resolve the problem quickly, prioritizing a successful outcome over personally mastering the underlying skill." },
      { value: "B", text: "Spend focused time reading technical guides and forums related to the problem until discovering a unique solution." },
      { value: "C", text: "Accept the difficulty for now and deal with the minor inconvenience until a simpler solution or external aid appears later." },
      { value: "D", text: "Enrol in a targeted course to learn the skill needed, ensuring this kind of problem can be solved for good." },
    ],
  },
  {
    id: "14",
    text: "You receive harsh, unfair criticism online from a public figure about a personal creative project.",
    options: [
      { value: "A", text: "Write a calm, factual response that addresses only the verifiable points, completely avoiding emotional defence." },
      { value: "B", text: "Send a kind, professional message stating that while respecting their platform, the harsh tone prevents constructive discussion." },
      { value: "C", text: "Seek coaching on public relations and crisis communication to learn how to deal with aggressive public figures effectively." },
      { value: "D", text: "Talk to trusted peers and ask them to act as a buffer for future comments or to take over the public-facing response." },
    ],
  },
  {
    id: "15",
    text: "You are tasked with defining a new household budget but there are multiple strong, conflicting opinions from family members.",
    options: [
      { value: "A", text: "Implement a budget you deem most effective, then proactively track data to show everyone that your method is superior." },
      { value: "B", text: "Talk to all family members, focusing on the reasons behind their opinions to synthesize a completely new, hybrid solution." },
      { value: "C", text: "Focus on designing a routine that equally minimizes the workload and maximizes the personal time for the two most critical people involved." },
      { value: "D", text: "Facilitate a structured discussion that helps all family members align on shared priorities and agree on a budget together." },
    ],
  },
];
