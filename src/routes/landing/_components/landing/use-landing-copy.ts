import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const copy = {
  en: {
    nav: {
      how: "How it works",
      audience: "Who it helps",
      faq: "FAQ",
      signIn: "Sign in",
      workflow: "See the workflow",
      main: "Main navigation",
      mobile: "Mobile navigation",
      open: "Open menu",
      close: "Close menu",
      skip: "Skip to content",
      language: "Language",
    },
    hero: {
      kicker: "For educators. Built around your knowledge.",
      title: "Your course materials.",
      accent: "A clearer path to learning.",
      body: "Turn teaching materials into connected concepts, practice and assessments. Review what AI proposes, then see where students need support.",
      sample: "See a sample workflow",
      explore: "Sign in to explore",
      note: "Explore the sample without an account. Instructors stay in control.",
    },
    visual: {
      caption: "One lesson. Connected learning.",
      example: "Illustrative example",
      material: "01 / TEACHING MATERIAL",
      lesson: "Introduction to databases",
      notes: "Your lesson notes and learning outcomes",
      concepts: "02 / CONCEPTS FOR REVIEW",
      conceptList: ["Tables", "Keys", "Relationships"],
      review: "Instructor reviews before publication",
      next: "03 / NEXT LEARNING STEP",
      revisit: "Revisit how foreign keys connect tables",
      evidence: "Use assessment evidence to guide the next practice activity.",
    },
    workflow: {
      kicker: "The workflow",
      title: "From your materials to their next step.",
      body: "Follow one database lesson through three steps. You bring the academic intent; AI helps connect the pieces.",
      explore: "Explore a sample workflow",
      noAccount: "Illustrative content · No account needed",
      stepsLabel: "Sample workflow steps",
      disclaimer:
        "An example of the learning process, not a live course or real student result.",
      panel: "Selected workflow step",
      step: "STEP",
      steps: [
        {
          label: "Start with materials",
          title: "A lesson you already teach",
          description:
            "Begin with your teaching materials and the outcome students should demonstrate.",
          detail: "Introduction to databases",
          eyebrow: "SAMPLE LESSON NOTES",
          content:
            "A primary key identifies a row. A foreign key references a key in another table, connecting related records.",
          outcome: "Learning outcome: explain how two tables are connected.",
        },
        {
          label: "Review the structure",
          title: "Make the connections explicit",
          description:
            "AI proposes concepts and relationships. The instructor checks the structure before sharing it with learners.",
          detail: "From notes to connected concepts",
          eyebrow: "SAMPLE INSTRUCTOR REVIEW",
          content: "Tables → Primary keys → Foreign keys → Relationships",
          outcome:
            "Review checkpoint: confirm definitions and prerequisite links.",
        },
        {
          label: "Find the next step",
          title: "Turn an answer into a teaching opportunity",
          description:
            "Use assessment evidence to identify the concept a learner should revisit.",
          detail: "Where should this learner practise next?",
          eyebrow: "ILLUSTRATIVE ASSESSMENT",
          content:
            "Question: What connects an order to its customer? Sample answer: “The order’s primary key.”",
          outcome:
            "Next practice: distinguish a primary key from a foreign key.",
        },
      ],
    },
    audience: {
      kicker: "A shared learning environment",
      title: "Clearer decisions for everyone involved.",
      cards: [
        {
          role: "Instructors",
          title: "Build on what you already teach.",
          description:
            "Bring your materials into a structured learning workflow, with review at the points that matter.",
          benefits: [
            "Review AI-proposed concepts",
            "Connect assessment to outcomes",
            "Identify where support is needed",
          ],
        },
        {
          role: "Learners",
          title: "Know what to work on next.",
          description:
            "Move through connected lessons, practise the concepts you find difficult and keep track of your progress.",
          benefits: [
            "See how concepts connect",
            "Revisit material through practice",
            "Follow your learning progress",
          ],
        },
        {
          role: "Faculty & program leaders",
          title: "Connect courses to a bigger picture.",
          description:
            "Bring program outcomes, course structure and learning evidence into a shared academic context.",
          benefits: [
            "Define program outcomes",
            "Organize connected courses",
            "Review evidence for improvement",
          ],
        },
      ],
    },
    governance: {
      kicker: "Responsible AI by design",
      title: "AI supports academic judgment. It does not replace it.",
      body: "aBridgeAI helps educators structure knowledge, identify learning gaps and act on evidence while keeping academic decisions with the people accountable for student outcomes.",
      heading: "Academic governance",
      subheading: "Built into the learning workflow",
      safeguards: [
        {
          title: "Human approval",
          description:
            "Instructors review AI-proposed concepts and learning content.",
        },
        {
          title: "Traceable alignment",
          description:
            "Learning evidence stays connected to outcomes and sources.",
        },
        {
          title: "Scoped access",
          description:
            "Roles and institutional boundaries shape what people can access.",
        },
      ],
    },
    faq: {
      kicker: "Before you begin",
      title: "A few useful answers.",
      body: "Understand the workflow and how to get started.",
      catalog: "browse the course catalog",
      help: "help center",
      items: [
        {
          question: "Can I explore before signing in?",
          answerBefore:
            "Yes. The sample workflow on this page is available without an account. To",
          answerAfter:
            ", you will be asked to sign in. Learning activities also depend on your enrollment and permissions.",
          link: "catalog",
        },
        {
          question: "Who reviews what AI creates?",
          answerBefore:
            "Instructors review AI-proposed concepts and learning content before publication. AI helps structure the material; academic review stays with educators.",
        },
        {
          question: "Is the sample a real course or student result?",
          answerBefore:
            "No. The database lesson and sample answer illustrate the workflow. They are not a live product session, a published course or real student performance data.",
        },
        {
          question: "How do I get access to a course?",
          answerBefore:
            "Sign in, browse the catalog and open a course to see its details and enrollment options. Some courses are restricted to an organization or department; contact the course owner if you need access.",
        },
        {
          question: "Where can our teaching team get help?",
          answerBefore: "Start with the",
          answerAfter:
            "for guidance on courses, learning and accounts. For teaching permissions or organizational access, contact your organization’s administrator.",
          link: "help",
        },
      ],
    },
    cta: {
      kicker: "Take the next step",
      title: "Find your next learning opportunity.",
      body: "Sign in to browse available courses and see what they cover. Need help with your account or course access? Start with our guide.",
      explore: "Sign in to explore",
      help: "Getting started help",
      note: "Course access depends on enrollment and organizational permissions.",
    },
  },
  vi: {
    nav: {
      how: "Cách hoạt động",
      audience: "Dành cho ai",
      faq: "Hỏi đáp",
      signIn: "Đăng nhập",
      workflow: "Xem quy trình",
      main: "Điều hướng chính",
      mobile: "Điều hướng di động",
      open: "Mở menu",
      close: "Đóng menu",
      skip: "Đến nội dung chính",
      language: "Ngôn ngữ",
    },
    hero: {
      kicker: "Dành cho nhà giáo dục. Xây dựng từ tri thức của bạn.",
      title: "Tài liệu môn học của bạn.",
      accent: "Lộ trình học tập rõ ràng hơn.",
      body: "Chuyển tài liệu giảng dạy thành hệ thống khái niệm, bài luyện tập và đánh giá có liên kết. Bạn duyệt đề xuất của AI, rồi xác định nơi người học cần hỗ trợ.",
      sample: "Xem quy trình mẫu",
      explore: "Đăng nhập để khám phá",
      note: "Xem mẫu mà không cần tài khoản. Giảng viên luôn giữ quyền kiểm soát.",
    },
    visual: {
      caption: "Một bài học. Một mạch kiến thức.",
      example: "Ví dụ minh họa",
      material: "01 / TÀI LIỆU GIẢNG DẠY",
      lesson: "Nhập môn cơ sở dữ liệu",
      notes: "Ghi chú bài giảng và chuẩn đầu ra",
      concepts: "02 / KHÁI NIỆM CẦN DUYỆT",
      conceptList: ["Bảng", "Khóa", "Quan hệ"],
      review: "Giảng viên duyệt trước khi xuất bản",
      next: "03 / BƯỚC HỌC TIẾP THEO",
      revisit: "Ôn lại cách khóa ngoại liên kết các bảng",
      evidence:
        "Dùng bằng chứng đánh giá để đề xuất hoạt động luyện tập tiếp theo.",
    },
    workflow: {
      kicker: "Quy trình",
      title: "Từ tài liệu của bạn đến bước học tiếp theo.",
      body: "Theo dõi một bài học cơ sở dữ liệu qua ba bước. Bạn xác định mục tiêu học thuật; AI hỗ trợ kết nối các thành phần.",
      explore: "Khám phá quy trình mẫu",
      noAccount: "Nội dung minh họa · Không cần tài khoản",
      stepsLabel: "Các bước của quy trình mẫu",
      disclaimer:
        "Đây là ví dụ quy trình, không phải khóa học thật hay kết quả của người học.",
      panel: "Bước quy trình đang chọn",
      step: "BƯỚC",
      steps: [
        {
          label: "Bắt đầu từ tài liệu",
          title: "Một bài học bạn đang giảng dạy",
          description:
            "Bắt đầu với tài liệu giảng dạy và chuẩn đầu ra người học cần đạt.",
          detail: "Nhập môn cơ sở dữ liệu",
          eyebrow: "GHI CHÚ BÀI GIẢNG MẪU",
          content:
            "Khóa chính định danh một hàng. Khóa ngoại tham chiếu đến khóa ở bảng khác để liên kết các bản ghi liên quan.",
          outcome: "Chuẩn đầu ra: giải thích cách hai bảng được liên kết.",
        },
        {
          label: "Duyệt cấu trúc",
          title: "Làm rõ các mối liên kết",
          description:
            "AI đề xuất khái niệm và quan hệ. Giảng viên kiểm tra cấu trúc trước khi chia sẻ với người học.",
          detail: "Từ ghi chú đến hệ thống khái niệm",
          eyebrow: "GIẢNG VIÊN DUYỆT MẪU",
          content: "Bảng → Khóa chính → Khóa ngoại → Quan hệ",
          outcome:
            "Điểm duyệt: xác nhận định nghĩa và liên kết kiến thức tiên quyết.",
        },
        {
          label: "Xác định bước tiếp theo",
          title: "Biến câu trả lời thành cơ hội giảng dạy",
          description:
            "Dùng bằng chứng đánh giá để xác định khái niệm người học cần ôn lại.",
          detail: "Người học nên luyện nội dung nào tiếp theo?",
          eyebrow: "ĐÁNH GIÁ MINH HỌA",
          content:
            "Câu hỏi: Điều gì liên kết một đơn hàng với khách hàng? Câu trả lời mẫu: “Khóa chính của đơn hàng.”",
          outcome: "Luyện tập tiếp: phân biệt khóa chính và khóa ngoại.",
        },
      ],
    },
    audience: {
      kicker: "Môi trường học tập kết nối",
      title: "Quyết định rõ ràng hơn cho mọi người.",
      cards: [
        {
          role: "Giảng viên",
          title: "Phát triển từ nội dung bạn đang dạy.",
          description:
            "Đưa tài liệu vào quy trình học tập có cấu trúc và duyệt tại những điểm quan trọng.",
          benefits: [
            "Duyệt khái niệm do AI đề xuất",
            "Liên kết đánh giá với chuẩn đầu ra",
            "Xác định nơi cần hỗ trợ",
          ],
        },
        {
          role: "Người học",
          title: "Biết nội dung cần học tiếp theo.",
          description:
            "Học qua các bài có liên kết, luyện những khái niệm còn khó và theo dõi tiến độ.",
          benefits: [
            "Hiểu cách các khái niệm liên kết",
            "Ôn lại kiến thức qua luyện tập",
            "Theo dõi tiến độ học tập",
          ],
        },
        {
          role: "Lãnh đạo khoa và chương trình",
          title: "Kết nối môn học với bức tranh tổng thể.",
          description:
            "Đặt chuẩn đầu ra, cấu trúc môn học và bằng chứng học tập trong cùng một bối cảnh học thuật.",
          benefits: [
            "Xác định chuẩn đầu ra chương trình",
            "Tổ chức các môn học liên kết",
            "Dùng bằng chứng để cải tiến",
          ],
        },
      ],
    },
    governance: {
      kicker: "AI có trách nhiệm ngay từ thiết kế",
      title: "AI hỗ trợ phán đoán học thuật, không thay thế nó.",
      body: "aBridgeAI hỗ trợ nhà giáo dục cấu trúc tri thức, nhận diện khoảng trống học tập và hành động dựa trên bằng chứng, trong khi quyết định học thuật vẫn thuộc về người chịu trách nhiệm cho kết quả của người học.",
      heading: "Quản trị học thuật",
      subheading: "Được tích hợp trong quy trình học tập",
      safeguards: [
        {
          title: "Con người phê duyệt",
          description:
            "Giảng viên duyệt các khái niệm và nội dung học tập do AI đề xuất.",
        },
        {
          title: "Liên kết có thể truy vết",
          description: "Bằng chứng học tập luôn gắn với chuẩn đầu ra và nguồn.",
        },
        {
          title: "Truy cập đúng phạm vi",
          description:
            "Vai trò và phạm vi tổ chức quyết định nội dung mỗi người có thể truy cập.",
        },
      ],
    },
    faq: {
      kicker: "Trước khi bắt đầu",
      title: "Một số câu trả lời hữu ích.",
      body: "Hiểu quy trình và cách bắt đầu.",
      catalog: "xem danh mục khóa học",
      help: "trung tâm trợ giúp",
      items: [
        {
          question: "Tôi có thể khám phá trước khi đăng nhập không?",
          answerBefore:
            "Có. Bạn có thể xem quy trình mẫu trên trang này mà không cần tài khoản. Để",
          answerAfter:
            ", bạn sẽ được yêu cầu đăng nhập. Hoạt động học tập còn phụ thuộc vào ghi danh và quyền truy cập.",
          link: "catalog",
        },
        {
          question: "Ai duyệt nội dung do AI tạo?",
          answerBefore:
            "Giảng viên duyệt các khái niệm và nội dung học tập do AI đề xuất trước khi xuất bản. AI hỗ trợ cấu trúc tài liệu; việc duyệt học thuật vẫn thuộc về nhà giáo dục.",
        },
        {
          question: "Ví dụ này có phải khóa học hoặc kết quả thật không?",
          answerBefore:
            "Không. Bài học cơ sở dữ liệu và câu trả lời mẫu chỉ minh họa quy trình, không phải phiên sản phẩm trực tiếp, khóa học đã xuất bản hay dữ liệu kết quả thật.",
        },
        {
          question: "Làm sao để truy cập một khóa học?",
          answerBefore:
            "Đăng nhập, xem danh mục rồi mở khóa học để xem chi tiết và tùy chọn ghi danh. Một số khóa học giới hạn theo tổ chức hoặc khoa; hãy liên hệ chủ khóa học nếu bạn cần quyền truy cập.",
        },
        {
          question: "Nhóm giảng dạy có thể nhận hỗ trợ ở đâu?",
          answerBefore: "Bắt đầu tại",
          answerAfter:
            "để xem hướng dẫn về khóa học, học tập và tài khoản. Với quyền giảng dạy hoặc quyền truy cập tổ chức, hãy liên hệ quản trị viên của đơn vị.",
          link: "help",
        },
      ],
    },
    cta: {
      kicker: "Bước tiếp theo",
      title: "Tìm cơ hội học tập tiếp theo.",
      body: "Đăng nhập để xem các khóa học hiện có và nội dung của chúng. Nếu cần hỗ trợ tài khoản hoặc quyền truy cập, hãy xem hướng dẫn.",
      explore: "Đăng nhập để khám phá",
      help: "Hướng dẫn bắt đầu",
      note: "Quyền truy cập khóa học phụ thuộc vào ghi danh và quyền của tổ chức.",
    },
  },
} as const;

export function useLandingCopy() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith("vi") ? "vi" : "en";
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return { c: copy[language], language, i18n };
}
