import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import { useCourse } from '../hooks/useCourse';
import { useCollections } from '../hooks/useCollections';
import { CourseSetup } from './course/CourseSetup';
import { PlanCard } from './course/PlanCard';
import { PlanCalendar } from './course/PlanCalendar';
import { PlanCourse } from './course/PlanCourse';

/**
 * /plan — the learner's course: today's to-do, a calendar of what was done
 * and what's coming, and the whole course week by week. With no course yet (or
 * `?edit=1`, from "Change"), the same setup a new learner sees on their first
 * visit; finishing it lands them on the flash card for their stage's words.
 */
export function PlanPage() {
  const course = useCourse((s) => s.course);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setActive = useCollections((s) => s.setActive);
  const intl = useIntl();

  if (!course || params.get('edit')) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="card-game border-accent-purple p-5 sm:p-6 animate-fade-in">
          <CourseSetup
            onDone={(collectionId, label) => {
              setActive(collectionId);
              toast.success(intl.formatMessage({ id: 'flashcard.start.studying' }, { name: label }));
              navigate('/');
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
      <PlanCard />
      <PlanCalendar course={course} />
      <PlanCourse course={course} />
    </div>
  );
}
