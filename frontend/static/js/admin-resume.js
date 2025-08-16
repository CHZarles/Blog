document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('resume-form');
    const saveStatus = document.getElementById('save-status');

    function createDynamicField(container, data, fields) {
        const card = document.createElement('div');
        card.className = 'dynamic-item card-inline';

        const left = document.createElement('div');
        left.className = 'dynamic-left';

        fields.forEach(field => {
            const row = document.createElement('div');
            row.className = 'field-row';
            const label = document.createElement('label');
            label.textContent = field;
            label.className = 'sr-label';

            if (field === 'logo') {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.name = `${container.id}_${field}`;

                const img = document.createElement('img');
                img.className = 'img-preview';
                img.alt = 'logo preview';
                if (data && data[field]) {
                    img.src = data[field];
                    img.dataset.dataurl = data[field];
                }

                fileInput.addEventListener('change', (ev) => {
                    const f = ev.target.files && ev.target.files[0];
                    if (!f) return;
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        img.src = e.target.result;
                        img.dataset.dataurl = e.target.result;
                    };
                    reader.readAsDataURL(f);
                });

                row.appendChild(label);
                row.appendChild(fileInput);
                row.appendChild(img);
                left.appendChild(row);
                return;
            }

            if (field === 'details' || field === 'description') {
                const textarea = document.createElement('textarea');
                textarea.name = `${container.id}_${field}`;
                textarea.placeholder = field;
                textarea.rows = 4;
                textarea.value = data ? (Array.isArray(data[field]) ? (data[field] || []).join('\n') : (data[field] || '')) : '';
                row.appendChild(label);
                row.appendChild(textarea);
                left.appendChild(row);
                return;
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.name = `${container.id}_${field}`;
            input.placeholder = field;
            input.value = data ? (Array.isArray(data[field]) ? data[field].join(', ') : (data[field] || '')) : '';
            row.appendChild(label);
            row.appendChild(input);
            left.appendChild(row);
        });

        const right = document.createElement('div');
        right.className = 'dynamic-right';
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'delete-btn small';
        removeBtn.textContent = '删除';
        removeBtn.onclick = () => card.remove();
        right.appendChild(removeBtn);

        card.appendChild(left);
        card.appendChild(right);
        container.appendChild(card);
        return card;
    }

    function setStatus(text, success = true) {
        if (!saveStatus) return;
        saveStatus.style.display = 'inline';
        saveStatus.textContent = text;
        saveStatus.style.color = success ? '#1f8f3a' : '#c82333';
        setTimeout(() => saveStatus.style.display = 'none', 2500);
    }

    // load existing resume (tolerate 404 / empty responses)
    fetch('/api/resume')
        .then(response => {
            if (!response.ok) {
                // no resume yet or other non-OK - allow admin to create one
                return {};
            }
            return response.json();
        })
        .then(data => {
            data = data || {};
            document.getElementById('name').value = data.name || '';
            document.getElementById('title').value = data.title || '';
            document.getElementById('summary').value = data.summary || '';
            document.getElementById('github_username').value = data.github_username || '';
            document.getElementById('location').value = data.location || '';
            document.getElementById('skills').value = (data.skills || []).join(', ');
            document.getElementById('contact_github').value = (data.contact && data.contact.github) || '';
            document.getElementById('contact_email').value = (data.contact && data.contact.email) || '';
            document.getElementById('contact_linkedin').value = (data.contact && data.contact.linkedin) || '';

            const educationContainer = document.getElementById('education-container');
            (data.education || []).forEach(edu => createDynamicField(educationContainer, edu, ['school', 'duration', 'logo']));

            const experienceContainer = document.getElementById('experience-container');
            (data.experience || []).forEach(exp => createDynamicField(experienceContainer, exp, ['title', 'duration', 'details']));

            const projectsContainer = document.getElementById('projects-container');
            (data.projects || []).forEach(proj => createDynamicField(projectsContainer, proj, ['name', 'description', 'link', 'tech']));
        })
        .catch(err => setStatus('加载失败', false));

    // add buttons
    document.getElementById('add-education').addEventListener('click', () => {
        createDynamicField(document.getElementById('education-container'), null, ['school', 'duration', 'logo']);
    });

    document.getElementById('add-experience').addEventListener('click', () => {
        createDynamicField(document.getElementById('experience-container'), null, ['title', 'duration', 'details']);
    });

    document.getElementById('add-project').addEventListener('click', () => {
        createDynamicField(document.getElementById('projects-container'), null, ['name', 'description', 'link', 'tech']);
    });

    function collectData() {
        const data = {
            name: document.getElementById('name').value,
            title: document.getElementById('title').value,
            summary: document.getElementById('summary').value,
            github_username: document.getElementById('github_username').value,
            location: document.getElementById('location').value,
            skills: document.getElementById('skills').value.split(',').map(s => s.trim()).filter(Boolean),
            contact: {
                github: document.getElementById('contact_github').value,
                email: document.getElementById('contact_email').value,
                linkedin: document.getElementById('contact_linkedin').value
            },
            education: [],
            experience: [],
            projects: []
        };

        // education
        document.querySelectorAll('#education-container .dynamic-item').forEach(card => {
            const inputs = card.querySelectorAll('input[type="text"]');
            const school = inputs[0] ? inputs[0].value : '';
            const duration = inputs[1] ? inputs[1].value : '';
            const img = card.querySelector('img.img-preview');
            const logo = img && img.dataset && img.dataset.dataurl ? img.dataset.dataurl : null;
            data.education.push({ school: school, duration: duration, logo: logo });
        });

        // experience
        document.querySelectorAll('#experience-container .dynamic-item').forEach(card => {
            const textInputs = card.querySelectorAll('input[type="text"]');
            const textarea = card.querySelector('textarea');
            const title = textInputs[0] ? textInputs[0].value : '';
            const duration = textInputs[1] ? textInputs[1].value : '';
            const detailsRaw = textarea ? textarea.value : '';
            const details = detailsRaw.split('\n').map(s => s.trim()).filter(Boolean);
            data.experience.push({ title: title, duration: duration, details: details });
        });

        // projects
        document.querySelectorAll('#projects-container .dynamic-item').forEach(card => {
            const nameInput = card.querySelector('input[name$="_name"]');
            const descTextarea = card.querySelector('textarea[name$="_description"]');
            const linkInput = card.querySelector('input[name$="_link"]');
            const techInput = card.querySelector('input[name$="_tech"]');

            const name = nameInput ? nameInput.value : '';
            const descriptionRaw = descTextarea ? descTextarea.value : '';
            const description = descriptionRaw.split('\n').map(s => s.trim()).filter(Boolean);
            const link = linkInput ? linkInput.value : '';
            const tech = techInput ? techInput.value.split(',').map(s => s.trim()).filter(Boolean) : [];

            data.projects.push({ name: name, description: description, link: link, tech: tech });
        });

        return data;
    }

    function save(data) {
        return fetch('/api/resume', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).then(response => {
            return response.text().then(text => {
                let body = null;
                try { body = text ? JSON.parse(text) : null; } catch(e) { body = { raw: text }; }
                return { ok: response.ok, status: response.status, body };
            });
        });
    }

    function handleSaveClick() {
        const d = collectData();
        save(d)
            .then(res => {
                if (res.ok) {
                    setStatus((res.body && (res.body.message || res.body.msg)) || '已保存');
                    // clear preview if any (so About will show DB content)
                    try { localStorage.removeItem('resume_preview'); } catch(e) {}
                } else {
                    const errMsg = (res.body && (res.body.error || res.body.message)) || `保存失败 (${res.status})`;
                    setStatus(errMsg, false);
                }
            })
            .catch(() => setStatus('保存失败', false));
    }

    document.getElementById('save-top').addEventListener('click', handleSaveClick);
    document.getElementById('save-bottom').addEventListener('click', handleSaveClick);

    document.getElementById('preview-about').addEventListener('click', () => {
        const d = collectData();
        try { localStorage.setItem('resume_preview', JSON.stringify(d)); } catch (e) {}
        window.open('/about?preview=1', '_blank');
    });
});
